import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLES } from '../scripts/bundles.js';

const PARAMS = { site: 'example', link_text: 'Link', link_url: 'https://example.com/' };
const SETTINGS = { properties: { site: 'example' } };

// Each bundle is checked for the code of the other integrations and adapters.
const MARKERS = {
  standalone: /analyticsContextLayerSettings/,
  drupal: /drupalSettings/,
  gtm: /,\s*event:\s*\w+\s*\}\)/,
  gtag: /window\.gtag/,
};

const FILES = BUNDLES.flatMap((bundle) => ['', '.min'].map((suffix) => ({ ...bundle, file: `${bundle.file}${suffix}.js` })));

function read(file) {
  return readFileSync(join(import.meta.dirname, '../build', file), 'utf8');
}

describe('Built bundles', () => {
  beforeEach(() => {
    window.dataLayer = [];
    window.sessionStorage.clear();
    document.body.innerHTML = '<div data-analytics-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';
  });

  afterEach(() => {
    window.analyticsContextLayer?.destroy();
    delete window.analyticsContextLayerSettings;
    delete window.analyticsContextLayerAdapter;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
    delete window.Drupal;
    delete window.drupalSettings;
    delete window.gtag;
    delete window.dataLayer;
  });

  it('builds 6 bundles', () => {
    expect(BUNDLES.map((bundle) => bundle.file)).toEqual(['acl.gtm', 'acl.gtag', 'acl', 'acl.drupal.gtm', 'acl.drupal.gtag', 'acl.drupal']);
  });

  it.each(FILES)('$file starts through $integration and sends to $adapter', ({ file, integration, adapter }) => {
    const custom = vi.fn();

    window.gtag = vi.fn();
    window.analyticsContextLayerAdapter = custom;

    if (integration === 'drupal') {
      window.Drupal = { behaviors: {} };
      window.drupalSettings = { analyticsContextLayer: SETTINGS };
    } else {
      window.analyticsContextLayerSettings = SETTINGS;
    }

    new Function(read(file))();
    window.Drupal?.behaviors.analyticsContextLayer.attach(document);
    document.querySelector('#link').click();

    expect(window.AnalyticsContextLayer).toBeTypeOf('function');
    expect(window.dataLayer).toEqual(adapter === 'gtm' ? [{ event: 'cta_click', ...PARAMS }] : []);
    expect(window.gtag.mock.calls).toEqual(adapter === 'gtag' ? [['event', 'cta_click', PARAMS]] : []);
    expect(custom.mock.calls.map(([name, params]) => [name, params])).toEqual(adapter === null ? [['cta_click', PARAMS]] : []);
  });

  it.each(FILES)('$file holds only its own integration and adapter', ({ file, integration, adapter }) => {
    const code = read(file);

    Object.entries(MARKERS).forEach(([name, marker]) => {
      expect(marker.test(code), `${name} in ${file}`).toBe(name === integration || name === adapter);
    });
  });

  it('acl.esm.js exports init() and both Google adapters', async () => {
    const { init, gtm, gtag, AnalyticsContextLayer } = await import('../build/acl.esm.js');
    const acl = init({ adapter: gtm, ...SETTINGS });

    document.querySelector('#link').click();
    acl.destroy();

    expect(acl).toBeInstanceOf(AnalyticsContextLayer);
    expect(gtag.send).toBeTypeOf('function');
    expect(window.dataLayer).toEqual([{ event: 'cta_click', ...PARAMS }]);
  });
});
