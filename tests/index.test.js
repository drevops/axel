import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Bundle entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    window.dataLayer = [];
    window.sessionStorage.clear();
    document.body.innerHTML = '<div data-analytics-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';
  });

  afterEach(() => {
    window.analyticsContextLayer?.destroy();
    delete window.analyticsContextLayerSettings;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
  });

  it('exposes the class and an initialized shared instance configured from settings', async () => {
    window.analyticsContextLayerSettings = { properties: { site: 'example' } };

    await import('../src/index.js');
    const { AnalyticsContextLayer, init } = await import('../src/acl.js');
    document.querySelector('#link').click();

    expect(window.AnalyticsContextLayer).toBe(AnalyticsContextLayer);
    expect(window.analyticsContextLayer).toBe(init());
    expect(window.dataLayer).toEqual([{ event: 'cta_click', site: 'example', link_text: 'Link', link_url: 'https://example.com/' }]);
  });

  it('initializes with default settings when none are defined', async () => {
    await import('../src/index.js');
    document.querySelector('#link').click();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('waits for the site to initialize when auto-init is disabled', async () => {
    window.analyticsContextLayerSettings = { autoInit: false };

    await import('../src/index.js');
    document.querySelector('#link').click();

    expect(window.dataLayer).toHaveLength(0);

    window.analyticsContextLayer.init();
    document.querySelector('#link').click();

    expect(window.dataLayer).toHaveLength(1);
  });
});
