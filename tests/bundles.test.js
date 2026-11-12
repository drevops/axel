import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLES } from '../scripts/bundles.js';

const PARAMS = { site: 'example', link_text: 'Link', click_type: 'link', link_url: 'https://example.com/' };
const SETTINGS = { properties: { site: 'example' } };

// Each bundle is checked for the code of the other integrations and adapters.
const MARKERS = {
  standalone: /axelSettings/,
  drupal: /drupalSettings/,
  gtm: /,\s*event:\s*\w+\s*\}\)/,
  gtag: /window\.gtag/,
};

// APIs that send data, store data or run code from a string.
const FORBIDDEN = {
  fetch: /\bfetch\s*\(/,
  XMLHttpRequest: /XMLHttpRequest/,
  sendBeacon: /sendBeacon/,
  WebSocket: /WebSocket/,
  EventSource: /EventSource/,
  eval: /\beval\s*\(/,
  Function: /\bFunction\s*\(/,
  'string timer': /set(?:Timeout|Interval)\s*\(\s*['"`]/,
  'document.cookie': /document\.cookie/,
  localStorage: /localStorage/,
  indexedDB: /indexedDB/,
  innerHTML: /\.(?:inner|outer)HTML\b/,
  insertAdjacentHTML: /insertAdjacentHTML/,
  'document.write': /document\.write/,
  'script element': /createElement\s*\(\s*['"`]script/,
  importScripts: /importScripts/,
};

const FILES = BUNDLES.flatMap((bundle) => ['', '.min'].map((suffix) => ({ ...bundle, file: `${bundle.file}${suffix}.js` })));

function read(file) {
  return readFileSync(join(import.meta.dirname, '../build', file), 'utf8');
}

describe('Built bundles', () => {
  beforeEach(() => {
    window.dataLayer = [];
    window.sessionStorage.clear();
    document.body.innerHTML = '<div data-axel-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';
  });

  afterEach(() => {
    window.axel?.destroy();
    delete window.axelSettings;
    delete window.axelAdapter;
    delete window.axel;
    delete window.Axel;
    delete window.Drupal;
    delete window.drupalSettings;
    delete window.gtag;
    delete window.dataLayer;
  });

  it('builds 6 bundles', () => {
    expect(BUNDLES.map((bundle) => bundle.file)).toEqual(['axel.gtm', 'axel.gtag', 'axel', 'axel.drupal.gtm', 'axel.drupal.gtag', 'axel.drupal']);
  });

  it.each(FILES)('$file starts through $integration and sends to $adapter', ({ file, integration, adapter }) => {
    const custom = vi.fn();

    window.gtag = vi.fn();
    window.axelAdapter = custom;

    if (integration === 'drupal') {
      window.Drupal = { behaviors: {} };
      window.drupalSettings = { axel: SETTINGS };
    } else {
      window.axelSettings = SETTINGS;
    }

    new Function(read(file))();
    window.Drupal?.behaviors.axel.attach(document);
    document.querySelector('#link').click();

    expect(window.Axel).toBeTypeOf('function');
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

  it.each([...FILES.map(({ file }) => file), 'axel.esm.js'])('%s uses no network, storage or code-evaluation APIs', (file) => {
    const code = read(file);

    Object.entries(FORBIDDEN).forEach(([name, pattern]) => {
      expect(pattern.test(code), `${name} in ${file}`).toBe(false);
    });
  });

  it('axel.esm.js exports init() and both Google adapters', async () => {
    const { init, gtm, gtag, Axel } = await import('../build/axel.esm.js');
    const axel = init({ adapter: gtm, ...SETTINGS });

    document.querySelector('#link').click();
    axel.destroy();

    expect(axel).toBeInstanceOf(Axel);
    expect(gtag.send).toBeTypeOf('function');
    expect(window.dataLayer).toEqual([{ event: 'cta_click', ...PARAMS }]);
  });
});
