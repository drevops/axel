import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsContextLayer, DEFAULT_SETTINGS, init } from '../../src/core/core.js';

const MARKUP = '<div data-analytics-event="cta_click" data-analytics-param-component="hero"><a id="link" href="/a">Go</a></div>';
const PARAMS = { link_text: 'Go', link_url: 'http://localhost:3000/a', component: 'hero' };

describe('AnalyticsContextLayer', () => {
  let acl;
  let adapter;

  beforeEach(() => {
    document.body.innerHTML = MARKUP;
    window.history.pushState({}, '', '/');
    window.sessionStorage.clear();
    adapter = { send: vi.fn() };
  });

  afterEach(() => {
    acl?.destroy();
    acl = null;
    vi.restoreAllMocks();
  });

  function sent() {
    return adapter.send.mock.calls.map(([name, params]) => [name, params]);
  }

  it('tracks clicks only by default', () => {
    acl = new AnalyticsContextLayer({ adapter });

    expect(acl.settings).toEqual({ ...DEFAULT_SETTINGS, adapter });
    expect(acl.settings.types).toEqual(['click']);
  });

  it('sends the event name, the parameters and the context to the adapter', () => {
    acl = new AnalyticsContextLayer({ adapter }).init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledWith('cta_click', PARAMS, { debug: false, settings: acl.settings });
  });

  it('uses a function as the adapter send()', () => {
    const send = vi.fn();

    acl = new AnalyticsContextLayer({ adapter: send }).init();
    document.querySelector('#link').click();

    expect(send).toHaveBeenCalledWith('cta_click', PARAMS, expect.any(Object));
  });

  it('adds properties that every other parameter overrides', () => {
    acl = new AnalyticsContextLayer({ adapter, properties: { site: 'example', component: 'default', link_text: 'default' } }).init();
    document.querySelector('#link').click();

    expect(sent()).toEqual([['cta_click', { site: 'example', ...PARAMS }]]);
  });

  it('binds once however many times it is initialized', () => {
    acl = new AnalyticsContextLayer({ adapter });

    expect(acl.init()).toBe(acl);
    expect(acl.init()).toBe(acl);

    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('can be initialized again after it is destroyed', () => {
    acl = new AnalyticsContextLayer({ adapter }).init();
    acl.destroy();
    acl.destroy();
    acl.init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('tracks every enabled type', () => {
    document.body.innerHTML = `${MARKUP}<form data-analytics-form="contact"><input id="field" name="email"></form><p data-analytics-form-submitted="contact"></p>`;
    acl = new AnalyticsContextLayer({ adapter, types: ['click', 'form_start', 'field_complete', 'form_submit'] }).init();

    document.querySelector('#link').click();
    document.querySelector('#field').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    document.querySelector('#field').dispatchEvent(new Event('change', { bubbles: true }));

    expect(sent().map(([name]) => name)).toEqual(['form_submit', 'cta_click', 'form_start', 'field_complete']);
  });

  it.each([
    ['a missing adapter', {}, 'The analytics adapter must be a function or an object with a send() function.'],
    ['an adapter without send()', { adapter: {} }, 'The analytics adapter must be a function or an object with a send() function.'],
    ['an unknown type', { adapter: vi.fn(), types: ['click', 'scroll'] }, 'Unknown analytics event type "scroll".'],
    ['an inherited property as a type', { adapter: vi.fn(), types: ['toString'] }, 'Unknown analytics event type "toString".'],
  ])('throws on %s', (_description, settings, message) => {
    expect(() => new AnalyticsContextLayer(settings)).toThrow(message);
  });

  describe('init()', () => {
    it('returns 1 shared instance and ignores later settings', () => {
      acl = init({ adapter, properties: { site: 'first' } });

      expect(init({ adapter, properties: { site: 'second' } })).toBe(acl);
      expect(acl.settings.properties).toEqual({ site: 'first' });

      document.querySelector('#link').click();

      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    it('creates a new shared instance once the previous one is destroyed', () => {
      const first = init({ adapter });

      first.destroy();
      acl = init({ adapter });

      expect(acl).not.toBe(first);
    });

    it('keeps the shared instance when another instance is destroyed', () => {
      acl = init({ adapter });
      new AnalyticsContextLayer({ adapter }).init().destroy();

      expect(init()).toBe(acl);
    });
  });

  describe('debug', () => {
    let log;
    let warn;

    beforeEach(() => {
      log = vi.spyOn(console, 'log').mockImplementation(() => {});
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('logs events and tells the adapter for the rest of the session once the debug hash is opened', () => {
      acl = new AnalyticsContextLayer({ adapter }).init();

      window.history.pushState({}, '', '/#analytics-debug');
      document.querySelector('#link').click();
      window.history.pushState({}, '', '/about');
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenLastCalledWith('[analytics]', 'cta_click', PARAMS);
      expect(adapter.send).toHaveBeenLastCalledWith('cta_click', PARAMS, { debug: true, settings: acl.settings });
    });

    it('does not log without the debug hash', () => {
      acl = new AnalyticsContextLayer({ adapter }).init();
      document.querySelector('#link').click();

      expect(log).not.toHaveBeenCalled();
    });

    it('uses custom debug settings', () => {
      acl = new AnalyticsContextLayer({ adapter, debugHash: '#debug', debugStorageKey: 'custom' }).init();
      window.history.pushState({}, '', '/#debug');
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem('custom')).toBe('1');
    });

    it.each([
      [1, 'with the debug hash', '/#analytics-debug'],
      [0, 'without the debug hash', '/'],
    ])('logs %i event(s) %s when the browser blocks storage', (logs, _description, url) => {
      acl = new AnalyticsContextLayer({ adapter }).init();

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage is blocked.');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage is blocked.');
      });
      window.history.pushState({}, '', url);
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(logs);
      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['the adapter validation warnings', ['first.', 'second.'], ['[analytics] cta_click: first.', '[analytics] cta_click: second.']],
      ['no warnings when the adapter validation passes', [], []],
    ])('prints %s', (_description, warnings, expected) => {
      adapter.validate = vi.fn(() => warnings);
      acl = new AnalyticsContextLayer({ adapter });
      window.history.pushState({}, '', '/#analytics-debug');
      acl.send('cta_click', { a: 1 });

      expect(adapter.validate).toHaveBeenCalledWith('cta_click', { a: 1 });
      expect(warn.mock.calls.map(([message]) => message)).toEqual(expected);
    });

    it('sends without validation when the adapter has none', () => {
      acl = new AnalyticsContextLayer({ adapter });
      window.history.pushState({}, '', '/#analytics-debug');
      acl.send('cta_click', {});

      expect(warn).not.toHaveBeenCalled();
      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    it('does not validate without the debug hash', () => {
      adapter.validate = vi.fn(() => ['first.']);
      acl = new AnalyticsContextLayer({ adapter });
      acl.send('cta_click', {});

      expect(adapter.validate).not.toHaveBeenCalled();
    });
  });
});
