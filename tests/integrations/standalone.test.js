import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MARKUP = '<div data-axel-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';

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
    window.axel?.destroy();
    delete window.axelSettings;
    delete window.axelAdapter;
    delete window.axelCollectors;
    delete window.axelLabelFilter;
    delete window.axel;
    delete window.Axel;
  });

  it('exposes the class and an initialized shared instance configured from settings', async () => {
    window.axelSettings = { properties: { site: 'example' } };

    start(adapter);
    const { Axel, init } = await import('../../src/core/core.js');
    document.querySelector('#link').click();

    expect(window.Axel).toBe(Axel);
    expect(window.axel).toBe(init());
    expect(adapter.send).toHaveBeenCalledWith(
      'cta_click',
      { site: 'example', link_text: 'Link', click_type: 'link', link_url: 'https://example.com/' },
      expect.any(Object),
    );
  });

  it('keeps the built-in adapter over one in the settings', () => {
    window.axelSettings = { adapter: vi.fn() };

    start(adapter);

    expect(window.axel.adapter).toBe(adapter);
  });

  it('uses the page adapter when none is built in', () => {
    window.axelAdapter = adapter;

    start();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('adds the page collectors to the collectors in the settings', () => {
    const page = vi.fn();
    const own = vi.fn();

    window.axelCollectors = { page, own: vi.fn() };
    window.axelSettings = { collectors: { own } };

    start(adapter);

    expect(window.axel.settings.collectors).toEqual({ page, own });
  });

  it.each([
    { name: 'the page label filter when the settings have none', settings: {}, expected: 'page' },
    { name: 'the label filter in the settings over the page label filter', settings: { labelFilter: () => 'settings' }, expected: 'settings' },
  ])('uses $name', ({ settings, expected }) => {
    window.axelLabelFilter = () => 'page';
    window.axelSettings = settings;

    start(adapter);
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledWith('cta_click', expect.objectContaining({ link_text: expected }), expect.any(Object));
  });

  it('throws when no adapter is built in or defined by the page', () => {
    expect(() => start()).toThrow('The analytics adapter must be a function or an object with a send() function.');
  });

  it('waits for the site to initialize when auto-init is disabled', () => {
    window.axelSettings = { autoInit: false };

    start(adapter);
    document.querySelector('#link').click();

    expect(adapter.send).not.toHaveBeenCalled();

    window.axel.init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });
});
