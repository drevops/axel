import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MARKUP = '<div data-analytics-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';

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
    window.analyticsContextLayer?.destroy();
    delete window.analyticsContextLayerSettings;
    delete window.analyticsContextLayerAdapter;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
  });

  it('exposes the class and an initialized shared instance configured from settings', async () => {
    window.analyticsContextLayerSettings = { properties: { site: 'example' } };

    start(adapter);
    const { AnalyticsContextLayer, init } = await import('../../src/core/core.js');
    document.querySelector('#link').click();

    expect(window.AnalyticsContextLayer).toBe(AnalyticsContextLayer);
    expect(window.analyticsContextLayer).toBe(init());
    expect(adapter.send).toHaveBeenCalledWith('cta_click', { site: 'example', link_text: 'Link', link_url: 'https://example.com/' }, expect.any(Object));
  });

  it('keeps the built-in adapter over one in the settings', () => {
    window.analyticsContextLayerSettings = { adapter: vi.fn() };

    start(adapter);

    expect(window.analyticsContextLayer.adapter).toBe(adapter);
  });

  it('uses the page adapter when none is built in', () => {
    window.analyticsContextLayerAdapter = adapter;

    start();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });

  it('throws when no adapter is built in or defined by the page', () => {
    expect(() => start()).toThrow('The analytics adapter must be a function or an object with a send() function.');
  });

  it('waits for the site to initialize when auto-init is disabled', () => {
    window.analyticsContextLayerSettings = { autoInit: false };

    start(adapter);
    document.querySelector('#link').click();

    expect(adapter.send).not.toHaveBeenCalled();

    window.analyticsContextLayer.init();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });
});
