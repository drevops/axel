import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const EXPECTED = [{ event: 'cta_click', site: 'example', link_text: 'Link', link_url: 'https://example.com/' }];

describe('Built bundles', () => {
  beforeEach(() => {
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

  it.each(['acl.js', 'acl.min.js'])('%s tracks clicks', (file) => {
    const code = readFileSync(join(import.meta.dirname, '../build', file), 'utf8');

    window.analyticsContextLayerSettings = { properties: { site: 'example' } };
    new Function(code)();
    document.querySelector('#link').click();

    expect(window.AnalyticsContextLayer).toBeTypeOf('function');
    expect(window.dataLayer).toEqual(EXPECTED);
  });

  it.each(['acl.drupal.js', 'acl.drupal.min.js'])('%s tracks clicks after the behavior attaches', (file) => {
    const code = readFileSync(join(import.meta.dirname, '../build', file), 'utf8');

    window.Drupal = { behaviors: {} };
    window.drupalSettings = { analyticsContextLayer: { properties: { site: 'example' } } };
    new Function(code)();
    window.Drupal.behaviors.analyticsContextLayer.attach(document);
    document.querySelector('#link').click();
    delete window.Drupal;
    delete window.drupalSettings;

    expect(window.AnalyticsContextLayer).toBeTypeOf('function');
    expect(window.dataLayer).toEqual(EXPECTED);
  });

  it('acl.esm.js exports init() that tracks clicks', async () => {
    const { init, AnalyticsContextLayer } = await import('../build/acl.esm.js');
    const acl = init({ properties: { site: 'example' } });

    document.querySelector('#link').click();
    acl.destroy();

    expect(acl).toBeInstanceOf(AnalyticsContextLayer);
    expect(window.dataLayer).toEqual(EXPECTED);
  });
});
