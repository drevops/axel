import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsContextLayer, DEFAULT_SETTINGS, LIMITS, init } from '../src/acl.js';

const MARKUP = '<div data-analytics-event="cta_click" data-analytics-param-component="hero"><a id="link" href="/a">Go</a></div>';

describe('AnalyticsContextLayer', () => {
  let acl;

  beforeEach(() => {
    document.body.innerHTML = MARKUP;
    window.dataLayer = [];
    window.history.pushState({}, '', '/');
    window.sessionStorage.clear();
  });

  afterEach(() => {
    acl?.destroy();
    acl = null;
    delete window.dataLayer;
    vi.restoreAllMocks();
  });

  it('tracks clicks only by default', () => {
    acl = new AnalyticsContextLayer().init();

    expect(acl.settings.types).toEqual(['click']);
    expect(acl.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('pushes to the data layer by default', () => {
    acl = new AnalyticsContextLayer().init();
    document.querySelector('#link').click();

    expect(window.dataLayer).toEqual([{ event: 'cta_click', link_text: 'Go', link_url: 'http://localhost:3000/a', component: 'hero' }]);
  });

  it('adds properties that every other parameter overrides', () => {
    acl = new AnalyticsContextLayer({ properties: { site: 'example', component: 'default', link_text: 'default' } }).init();
    document.querySelector('#link').click();

    expect(window.dataLayer).toEqual([{ event: 'cta_click', site: 'example', component: 'hero', link_text: 'Go', link_url: 'http://localhost:3000/a' }]);
  });

  it('binds once however many times it is initialized', () => {
    acl = new AnalyticsContextLayer();

    expect(acl.init()).toBe(acl);
    expect(acl.init()).toBe(acl);

    document.querySelector('#link').click();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('can be initialized again after it is destroyed', () => {
    acl = new AnalyticsContextLayer().init();
    acl.destroy();
    acl.destroy();
    acl.init();
    document.querySelector('#link').click();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('tracks every enabled type', () => {
    document.body.innerHTML = `${MARKUP}<form data-analytics-form="contact"><input id="field" name="email"></form><p data-analytics-form-submitted="contact"></p>`;
    acl = new AnalyticsContextLayer({ types: ['click', 'form_start', 'field_complete', 'form_submit'] }).init();

    document.querySelector('#link').click();
    document.querySelector('#field').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    document.querySelector('#field').dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer.map((event) => event.event)).toEqual(['form_submit', 'cta_click', 'form_start', 'field_complete']);
  });

  it.each([
    ['an unknown type', { types: ['click', 'scroll'] }, 'Unknown analytics event type "scroll".'],
    ['an inherited property as a type', { types: ['toString'] }, 'Unknown analytics event type "toString".'],
    ['an unknown sink', { sink: 'segment' }, 'Unknown analytics sink "segment".'],
  ])('throws on %s', (_description, settings, message) => {
    expect(() => new AnalyticsContextLayer(settings)).toThrow(message);
  });

  describe('init()', () => {
    it('returns 1 shared instance and ignores later settings', () => {
      acl = init({ properties: { site: 'first' } });

      expect(init({ properties: { site: 'second' } })).toBe(acl);
      expect(acl.settings.properties).toEqual({ site: 'first' });

      document.querySelector('#link').click();

      expect(window.dataLayer).toHaveLength(1);
    });

    it('creates a new shared instance once the previous one is destroyed', () => {
      const first = init();

      first.destroy();
      acl = init();

      expect(acl).not.toBe(first);
    });

    it('keeps the shared instance when another instance is destroyed', () => {
      acl = init();
      new AnalyticsContextLayer().init().destroy();

      expect(init()).toBe(acl);
    });
  });

  describe('debug', () => {
    let log;

    beforeEach(() => {
      log = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('logs and flags events for the rest of the session once the debug hash is opened', () => {
      acl = new AnalyticsContextLayer().init();
      const params = { link_text: 'Go', link_url: 'http://localhost:3000/a', component: 'hero', debug_mode: true };

      window.history.pushState({}, '', '/#analytics-debug');
      document.querySelector('#link').click();
      window.history.pushState({}, '', '/about');
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenLastCalledWith('[analytics]', 'cta_click', params);
      expect(window.dataLayer.at(-1)).toEqual({ event: 'cta_click', ...params });
    });

    it('does not log without the debug hash', () => {
      acl = new AnalyticsContextLayer().init();
      document.querySelector('#link').click();

      expect(log).not.toHaveBeenCalled();
      expect(window.dataLayer[0].debug_mode).toBeUndefined();
    });

    it('uses custom debug settings', () => {
      acl = new AnalyticsContextLayer({ debugHash: '#debug', debugStorageKey: 'custom' }).init();
      window.history.pushState({}, '', '/#debug');
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem('custom')).toBe('1');
    });

    it.each([
      [1, 'with the debug hash', '/#analytics-debug'],
      [0, 'without the debug hash', '/'],
    ])('logs %i event(s) %s when the browser blocks storage', (logs, _description, url) => {
      acl = new AnalyticsContextLayer().init();

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage is blocked.');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage is blocked.');
      });
      window.history.pushState({}, '', url);
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(logs);
      expect(window.dataLayer).toHaveLength(1);
    });

    it.each([
      ['an event within the limits', 'cta_click', { a: 'x'.repeat(LIMITS.paramValue) }, []],
      [
        'a long event name',
        'x'.repeat(LIMITS.eventName + 1),
        {},
        [`[analytics] ${'x'.repeat(LIMITS.eventName + 1)}: event name is longer than 40 characters.`],
      ],
      [
        'too many parameters',
        'cta_click',
        Object.fromEntries(Array.from({ length: LIMITS.params }, (_value, index) => [`p${index}`, index])),
        ['[analytics] cta_click: more than 25 parameters.'],
      ],
      [
        'long parameter values',
        'cta_click',
        { a: 'x'.repeat(LIMITS.paramValue + 1), b: 1, c: 'y'.repeat(LIMITS.paramValue + 1) },
        ['[analytics] cta_click: "a" is longer than 100 characters.', '[analytics] cta_click: "c" is longer than 100 characters.'],
      ],
    ])('warns about %s', (_description, name, params, warnings) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      acl = new AnalyticsContextLayer();
      window.history.pushState({}, '', '/#analytics-debug');
      acl.send(name, params);

      expect(warn.mock.calls.map(([message]) => message)).toEqual(warnings);
    });

    it('does not check the limits without the debug hash', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      acl = new AnalyticsContextLayer();
      acl.send('x'.repeat(LIMITS.eventName + 1), {});

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
