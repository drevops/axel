import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Built bundles', () => {
  beforeEach(() => {
    window.dataLayer = [];
    window.localStorage.clear();
    window.analyticsContextLayerSettings = { properties: { site_type: 'example' } };
    document.body.innerHTML = '<div data-component="demo"><a href="https://example.com" id="link">Link</a></div>';
  });

  afterEach(() => {
    delete window.analyticsContextLayerSettings;
    delete window.analyticsContextLayer;
    delete window.AnalyticsContextLayer;
  });

  it.each(['acl.js', 'acl.min.js'])('%s tracks interactions', (file) => {
    const code = readFileSync(join(import.meta.dirname, '../build', file), 'utf8');

    new Function(code)();
    document.querySelector('#link').dispatchEvent(new Event('click'));

    expect(window.AnalyticsContextLayer).toBeTypeOf('function');
    expect(window.dataLayer).toEqual([
      {
        event: 'click_secondary_interaction',
        element_name: 'demo-link',
        click_type: 'link',
        click_text: 'Link',
        link_url: 'https://example.com',
        component_name: 'demo',
        group_title: '',
        site_type: 'example',
      },
    ]);
  });
});
