import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Drupal entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    window.Drupal = { behaviors: {} };
    window.drupalSettings = {};
    window.dataLayer = [];
    window.sessionStorage.clear();
    document.body.innerHTML = '<div data-analytics-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';
  });

  afterEach(() => {
    window.analyticsContextLayer?.destroy();
    delete window.Drupal;
    delete window.drupalSettings;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
  });

  it('initializes the shared instance from drupalSettings once however many times the behavior attaches', async () => {
    window.drupalSettings.analyticsContextLayer = { properties: { site: 'example' } };

    await import('../src/drupal.js');
    const { AnalyticsContextLayer, init } = await import('../src/acl.js');

    expect(window.AnalyticsContextLayer).toBe(AnalyticsContextLayer);
    expect(window.analyticsContextLayer).toBeUndefined();

    window.Drupal.behaviors.analyticsContextLayer.attach(document);
    window.Drupal.behaviors.analyticsContextLayer.attach(document.body);
    document.querySelector('#link').click();

    expect(window.analyticsContextLayer).toBe(init());
    expect(window.dataLayer).toEqual([{ event: 'cta_click', site: 'example', link_text: 'Link', link_url: 'https://example.com/' }]);
  });

  it('initializes with default settings when drupalSettings has none', async () => {
    await import('../src/drupal.js');
    window.Drupal.behaviors.analyticsContextLayer.attach(document);
    document.querySelector('#link').click();

    expect(window.analyticsContextLayer.settings.types).toEqual(['click']);
    expect(window.dataLayer).toHaveLength(1);
  });
});
