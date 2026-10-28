import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Axel, DEFAULT_SETTINGS, init } from '../../src/core/core.js';

const MARKUP = '<div data-axel-event="cta_click" data-axel-param-component="hero"><a id="link" href="/a">Go</a></div>';
const PARAMS = { link_text: 'Go', click_type: 'link', link_url: 'http://localhost:3000/a', component: 'hero' };

describe('Axel', () => {
  let axel;
  let adapter;

  beforeEach(() => {
    document.body.innerHTML = MARKUP;
    window.history.pushState({}, '', '/');
    window.sessionStorage.clear();
    adapter = { send: vi.fn() };
  });

  afterEach(() => {
    axel?.destroy();
    axel = null;
    vi.restoreAllMocks();
  });

  function sent() {
    return adapter.send.mock.calls.map(([name, params]) => [name, params]);
  }

  it('tracks clicks only by default', () => {
    axel = new Axel({ adapter });

    expect(axel.settings).toEqual({ ...DEFAULT_SETTINGS, adapter });
    expect(axel.settings.types).toEqual(['click']);
  });

  it('sends the event name, the parameters and the context to the adapter', () => {
    axel = new Axel({ adapter }).init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledWith('cta_click', PARAMS, { debug: false, settings: axel.settings });
  });

  it('uses a function as the adapter send()', () => {
    const send = vi.fn();

    axel = new Axel({ adapter: send }).init();
    document.querySelector('#link').click();

    expect(send).toHaveBeenCalledWith('cta_click', PARAMS, expect.any(Object));
  });

  it('adds properties that every other parameter overrides', () => {
    axel = new Axel({ adapter, properties: { site: 'example', component: 'default', link_text: 'default' } }).init();
    document.querySelector('#link').click();

    expect(sent()).toEqual([['cta_click', { site: 'example', ...PARAMS }]]);
  });

  it('binds once however many times it is initialized', () => {
    axel = new Axel({ adapter });

    expect(axel.init()).toBe(axel);
    expect(axel.init()).toBe(axel);

    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('can be initialized again after it is destroyed', () => {
    axel = new Axel({ adapter }).init();
    axel.destroy();
    axel.destroy();
    axel.init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('tracks every enabled type', () => {
    document.body.innerHTML = `${MARKUP}<form data-axel-form="contact"><input id="field" name="email"></form><p data-axel-form-submitted="contact"></p>`;
    axel = new Axel({ adapter, types: ['click', 'form_start', 'field_complete', 'form_submit'] }).init();

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
    [
      'a collector that is not a function',
      { adapter: vi.fn(), collectors: { position: 'position' } },
      'The analytics collector "position" must be a function.',
    ],
  ])('throws on %s', (_description, settings, message) => {
    expect(() => new Axel(settings)).toThrow(message);
  });

  describe('collectors', () => {
    let error;

    beforeEach(() => {
      document.body.innerHTML = `<div data-axel-collector="outer"><div id="source" data-axel-collector="position">${MARKUP}</div></div>`;
      error = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('merges what the closest collector returns over the other parameters', () => {
      const collectors = { outer: vi.fn(), position: vi.fn(() => ({ position: '1', component: 'collected' })) };

      axel = new Axel({ adapter, collectors }).init();
      document.querySelector('#link').click();

      expect(collectors.outer).not.toHaveBeenCalled();
      expect(collectors.position).toHaveBeenCalledWith('cta_click', PARAMS, {
        element: document.querySelector('#link'),
        source: document.querySelector('#source'),
      });
      expect(sent()).toEqual([['cta_click', { ...PARAMS, position: '1', component: 'collected' }]]);
    });

    it('passes the collector a copy of the parameters', () => {
      const position = (_name, params) => {
        params.link_text = 'changed';
      };

      axel = new Axel({ adapter, collectors: { position } }).init();
      document.querySelector('#link').click();

      expect(sent()).toEqual([['cta_click', PARAMS]]);
    });

    it('runs the collector for every event type tracked from inside it', () => {
      document.body.innerHTML = `<div data-axel-collector="position">${MARKUP}<form data-axel-form="contact"><input id="field" name="email"></form><p data-axel-form-submitted="contact"></p></div>`;
      const position = vi.fn(() => ({ position: '1' }));

      axel = new Axel({ adapter, types: ['click', 'form_start', 'field_complete', 'form_submit'], collectors: { position } }).init();
      document.querySelector('#link').click();
      document.querySelector('#field').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      document.querySelector('#field').dispatchEvent(new Event('change', { bubbles: true }));

      expect(position.mock.calls.map(([name]) => name)).toEqual(['form_submit', 'cta_click', 'form_start', 'field_complete']);
      expect(sent().map(([, params]) => params.position)).toEqual(['1', '1', '1', '1']);
    });

    it.each([
      ['an unknown collector', 'missing', {}, ['[axel] Unknown analytics collector "missing".']],
      ['an inherited property as a collector', 'toString', {}, ['[axel] Unknown analytics collector "toString".']],
      [
        'a collector that throws',
        'position',
        {
          position: () => {
            throw new Error('Broken.');
          },
        },
        ['[axel] Broken.'],
      ],
      ['a collector that returns a string', 'position', { position: () => 'position' }, ['[axel] The analytics collector "position" must return an object.']],
      ['a collector that returns an array', 'position', { position: () => ['1'] }, ['[axel] The analytics collector "position" must return an object.']],
      ['a collector that returns null', 'position', { position: () => null }, []],
    ])('sends the event without collected parameters for %s', (_description, collectorName, collectors, errors) => {
      document.querySelector('#source').setAttribute('data-axel-collector', collectorName);
      axel = new Axel({ adapter, collectors }).init();
      document.querySelector('#link').click();

      expect(sent()).toEqual([['cta_click', PARAMS]]);
      expect(error.mock.calls.map(([message]) => message)).toEqual(errors);
    });
  });

  describe('init()', () => {
    it('returns 1 shared instance and ignores later settings', () => {
      axel = init({ adapter, properties: { site: 'first' } });

      expect(init({ adapter, properties: { site: 'second' } })).toBe(axel);
      expect(axel.settings.properties).toEqual({ site: 'first' });

      document.querySelector('#link').click();

      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    it('creates a new shared instance once the previous one is destroyed', () => {
      const first = init({ adapter });

      first.destroy();
      axel = init({ adapter });

      expect(axel).not.toBe(first);
    });

    it('keeps the shared instance when another instance is destroyed', () => {
      axel = init({ adapter });
      new Axel({ adapter }).init().destroy();

      expect(init()).toBe(axel);
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
      axel = new Axel({ adapter }).init();

      window.history.pushState({}, '', '/#axel-debug');
      document.querySelector('#link').click();
      window.history.pushState({}, '', '/about');
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenLastCalledWith('[axel]', 'cta_click', PARAMS);
      expect(adapter.send).toHaveBeenLastCalledWith('cta_click', PARAMS, { debug: true, settings: axel.settings });
    });

    it('does not log without the debug hash', () => {
      axel = new Axel({ adapter }).init();
      document.querySelector('#link').click();

      expect(log).not.toHaveBeenCalled();
    });

    it('uses custom debug settings', () => {
      axel = new Axel({ adapter, debugHash: '#debug', debugStorageKey: 'custom' }).init();
      window.history.pushState({}, '', '/#debug');
      document.querySelector('#link').click();

      expect(log).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem('custom')).toBe('1');
    });

    it.each([
      [1, 'with the debug hash', '/#axel-debug'],
      [0, 'without the debug hash', '/'],
    ])('logs %i event(s) %s when the browser blocks storage', (logs, _description, url) => {
      axel = new Axel({ adapter }).init();

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
      ['the adapter validation warnings', ['first.', 'second.'], ['[axel] cta_click: first.', '[axel] cta_click: second.']],
      ['no warnings when the adapter validation passes', [], []],
    ])('prints %s', (_description, warnings, expected) => {
      adapter.validate = vi.fn(() => warnings);
      axel = new Axel({ adapter });
      window.history.pushState({}, '', '/#axel-debug');
      axel.send('cta_click', { a: 1 });

      expect(adapter.validate).toHaveBeenCalledWith('cta_click', { a: 1 });
      expect(warn.mock.calls.map(([message]) => message)).toEqual(expected);
    });

    it('sends without validation when the adapter has none', () => {
      axel = new Axel({ adapter });
      window.history.pushState({}, '', '/#axel-debug');
      axel.send('cta_click', {});

      expect(warn).not.toHaveBeenCalled();
      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    it('does not validate without the debug hash', () => {
      adapter.validate = vi.fn(() => ['first.']);
      axel = new Axel({ adapter });
      axel.send('cta_click', {});

      expect(adapter.validate).not.toHaveBeenCalled();
    });
  });
});
