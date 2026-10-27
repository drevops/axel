import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Bundle entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    window.dataLayer = [];
    window.localStorage.clear();
    document.body.innerHTML = '<div data-component="demo"><a href="https://example.com" id="link">Link</a></div>';
  });

  afterEach(() => {
    delete window.analyticsContextLayerSettings;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
    delete document.readyState;
  });

  it('exposes the class and an instance configured from settings', async () => {
    window.analyticsContextLayerSettings = { properties: { site_type: 'example' } };

    await import('../src/index.js');
    const { AnalyticsContextLayer } = await import('../src/acl.js');
    document.querySelector('#link').dispatchEvent(new Event('click'));

    expect(window.AnalyticsContextLayer).toBe(AnalyticsContextLayer);
    expect(window.analyticsContextLayer).toBeInstanceOf(AnalyticsContextLayer);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0].site_type).toBe('example');
  });

  it('attaches on DOMContentLoaded while the document is loading', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

    await import('../src/index.js');
    document.querySelector('#link').dispatchEvent(new Event('click'));

    expect(window.dataLayer).toHaveLength(0);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.querySelector('#link').dispatchEvent(new Event('click'));

    expect(window.dataLayer).toHaveLength(1);
  });

  it('does not attach when auto-attach is disabled', async () => {
    window.analyticsContextLayerSettings = { autoAttach: false };

    await import('../src/index.js');
    document.querySelector('#link').dispatchEvent(new Event('click'));

    expect(window.dataLayer).toHaveLength(0);
  });
});
