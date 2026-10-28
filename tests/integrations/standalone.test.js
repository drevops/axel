import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MARKUP = '<div data-acl-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';

describe('standalone integration', () => {
  let start;
  let adapter;

  beforeEach(async () => {
    vi.resetModules();
    ({ start } = await import('../../src/integrations/standalone.js'));
    adapter = { send: vi.fn() };
    window.sessionStorage.clear();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    window.acl?.destroy();
    delete window.aclSettings;
    delete window.aclAdapter;
    delete window.aclCollectors;
    delete window.acl;
    delete window.Acl;
  });

  it('exposes the class and an initialized shared instance configured from settings', async () => {
    window.aclSettings = { properties: { site: 'example' } };

    start(adapter);
    const { Acl, init } = await import('../../src/core/core.js');
    document.querySelector('#link').click();

    expect(window.Acl).toBe(Acl);
    expect(window.acl).toBe(init());
    expect(adapter.send).toHaveBeenCalledWith(
      'cta_click',
      { site: 'example', link_text: 'Link', click_type: 'link', link_url: 'https://example.com/' },
      expect.any(Object),
    );
  });

  it('keeps the built-in adapter over one in the settings', () => {
    window.aclSettings = { adapter: vi.fn() };

    start(adapter);

    expect(window.acl.adapter).toBe(adapter);
  });

  it('uses the page adapter when none is built in', () => {
    window.aclAdapter = adapter;

    start();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('adds the page collectors to the collectors in the settings', () => {
    const page = vi.fn();
    const own = vi.fn();

    window.aclCollectors = { page, own: vi.fn() };
    window.aclSettings = { collectors: { own } };

    start(adapter);

    expect(window.acl.settings.collectors).toEqual({ page, own });
  });

  it('throws when no adapter is built in or defined by the page', () => {
    expect(() => start()).toThrow('The analytics adapter must be a function or an object with a send() function.');
  });

  it('waits for the site to initialize when auto-init is disabled', () => {
    window.aclSettings = { autoInit: false };

    start(adapter);
    document.querySelector('#link').click();

    expect(adapter.send).not.toHaveBeenCalled();

    window.acl.init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });
});
