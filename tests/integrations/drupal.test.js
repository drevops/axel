import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MARKUP = '<div data-analytics-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';

describe('Drupal integration', () => {
  let start;
  let adapter;

  beforeEach(async () => {
    vi.resetModules();
    ({ start } = await import('../../src/integrations/drupal.js'));
    adapter = { send: vi.fn() };
    window.Drupal = { behaviors: {} };
    window.drupalSettings = {};
    window.sessionStorage.clear();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    window.analyticsContextLayer?.destroy();
    delete window.Drupal;
    delete window.drupalSettings;
    delete window.analyticsContextLayerAdapter;
    delete window.analyticsContextLayerCollectors;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
  });

  function attach(context = document) {
    window.Drupal.behaviors.analyticsContextLayer.attach(context);
  }

  it('initializes the shared instance from drupalSettings once however many times the behavior attaches', async () => {
    window.drupalSettings.analyticsContextLayer = { properties: { site: 'example' } };

    start(adapter);
    const { AnalyticsContextLayer, init } = await import('../../src/core/core.js');

    expect(window.AnalyticsContextLayer).toBe(AnalyticsContextLayer);
    expect(window.analyticsContextLayer).toBeUndefined();

    attach();
    attach(document.body);
    document.querySelector('#link').click();

    expect(window.analyticsContextLayer).toBe(init());
    expect(adapter.send).toHaveBeenCalledTimes(1);
    expect(adapter.send).toHaveBeenCalledWith(
      'cta_click',
      { site: 'example', link_text: 'Link', click_type: 'link', link_url: 'https://example.com/' },
      expect.any(Object),
    );
  });

  it('initializes with default settings when drupalSettings has none', () => {
    start(adapter);
    attach();

    expect(window.analyticsContextLayer.settings.types).toEqual(['click']);
  });

  it('uses the page collectors defined before the behavior attaches', () => {
    const page = vi.fn();

    start(adapter);
    window.analyticsContextLayerCollectors = { page };
    attach();

    expect(window.analyticsContextLayer.settings.collectors).toEqual({ page });
  });

  it('uses the page adapter defined before the behavior attaches', () => {
    start();
    window.analyticsContextLayerAdapter = adapter;
    attach();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });
});
