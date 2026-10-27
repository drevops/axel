import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsContextLayer, DEFAULT_SETTINGS } from '../src/acl.js';

const fixture = readFileSync(join(import.meta.dirname, 'fixtures/analytics.html'), 'utf8');

function loadFixture() {
  const match = fixture.match(/<body[^>]*>([\s\S]*)<\/body>/i);

  document.body.innerHTML = match ? match[1] : fixture;
}

function trigger(selector) {
  const element = document.querySelector(selector);

  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'click'));
}

function flushMutations() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AnalyticsContextLayer', () => {
  let acl;

  beforeEach(() => {
    window.dataLayer = [];
    window.localStorage.clear();
    window.location.hash = '';

    window.testCollectors = {
      search(obj, element, component, instance) {
        delete obj.group_title;
        obj.search_term = instance.getFieldText('#search-keywords') || 'none';
        obj.filter_types_selected = instance.getFieldText('[data-subcomponent=filter-types] input') || 'none';
        obj.filter_tags_selected = instance.getFieldText('[data-subcomponent=filter-tags] input') || 'none';
      },
    };

    loadFixture();

    acl = new AnalyticsContextLayer({ properties: { site_type: 'example' } });
    acl.attach(document);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.testCollectors;
  });

  it.each([
    [
      'Link, No heading',
      '#el-2',
      {
        event: 'click_secondary_interaction',
        element_name: 'generic-link',
        click_type: 'link',
        click_text: 'Link #2 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'generic',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Link as Button, No heading',
      '#el-3',
      {
        event: 'click_secondary_interaction',
        element_name: 'generic-cta',
        click_type: 'button',
        click_text: 'Button #3 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'generic',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Button, No heading',
      '#el-4',
      {
        event: 'click_secondary_interaction',
        element_name: 'generic-cta',
        click_type: 'button',
        click_text: 'Button #4 text with inner HTML',
        link_url: '',
        component_name: 'generic',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Link, Heading, custom event and element_name',
      '#el-6',
      {
        event: 'custom-link-click',
        element_name: 'custom-link',
        click_type: 'link',
        click_text: 'Link #6 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'generic',
        group_title: 'Heading #5 text with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Button, Heading, custom event and element_name',
      '#el-7',
      {
        event: 'custom-button-click',
        element_name: 'custom-button',
        click_type: 'button',
        click_text: 'Button #7 text with inner HTML',
        link_url: '',
        component_name: 'generic',
        group_title: 'Heading #5 text with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Link, Heading by data attribute',
      '#el-9',
      {
        event: 'click_secondary_interaction',
        element_name: 'generic-link',
        click_type: 'link',
        click_text: 'Link #9 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'generic',
        group_title: 'Heading #8 text with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Button, Heading by data attribute',
      '#el-10',
      {
        event: 'click_secondary_interaction',
        element_name: 'generic-cta',
        click_type: 'button',
        click_text: 'Button #10 text with inner HTML',
        link_url: '',
        component_name: 'generic',
        group_title: 'Heading #8 text with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Link, Heading by data attribute within a group',
      '#el-13',
      {
        event: 'generic-custom-event',
        element_name: 'generic-custom-name',
        click_type: 'link',
        click_text: 'Link #13 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'generic',
        group_title: 'Heading #12 text group with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Button, Heading by data attribute within a group',
      '#el-14',
      {
        event: 'generic-custom-event',
        element_name: 'generic-custom-name',
        click_type: 'button',
        click_text: 'Button #14 text with inner HTML',
        link_url: '',
        component_name: 'generic',
        group_title: 'Heading #12 text group with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Select, Component is an element itself',
      '#el-15',
      {
        event: 'custom-select-click',
        element_name: 'custom-select',
        click_type: 'button',
        click_text: 'Option 1',
        link_url: '',
        component_name: 'genericself',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Form submit, button',
      '#el-16',
      {
        event: 'click_secondary_interaction',
        element_name: 'genericform-cta',
        click_type: 'button',
        click_text: 'Button #16 text with inner HTML',
        link_url: 'http://example.com',
        component_name: 'genericform',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Form submit, input',
      '#el-17',
      {
        event: 'click_secondary_interaction',
        element_name: 'genericform-cta',
        click_type: 'button',
        click_text: 'Button #17 text',
        link_url: 'http://example.com',
        component_name: 'genericform',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Icon button',
      '#el-18',
      {
        event: 'click_secondary_interaction',
        element_name: 'genericdialog-icon',
        click_type: 'button',
        click_text: 'Close message icon',
        link_url: '',
        component_name: 'genericdialog',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Parent lookup, link',
      '#el-23',
      {
        event: 'click_secondary_interaction',
        element_name: 'genericchild-link',
        click_type: 'link',
        click_text: 'Link #23 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'genericchild',
        group_title: 'Heading #22 text as a parent of the component with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Parent lookup, button',
      '#el-24',
      {
        event: 'click_secondary_interaction',
        element_name: 'genericchild-cta',
        click_type: 'button',
        click_text: 'Button #24 text with inner HTML',
        link_url: '',
        component_name: 'genericchild',
        group_title: 'Heading #22 text as a parent of the component with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Descendants, link',
      '#el-25',
      {
        event: 'genericwithdescendants-custom-event',
        element_name: 'genericwithdescendants-custom-element-name',
        click_type: 'genericwithdescendants-custom-click-type',
        click_text: 'Link #25 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'genericwithdescendants',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Descendants, button',
      '#el-26',
      {
        event: 'genericwithdescendants-custom-event',
        element_name: 'genericwithdescendants-custom-element-name',
        click_type: 'genericwithdescendants-custom-click-type',
        click_text: 'Button #26 text with inner HTML',
        link_url: '',
        component_name: 'genericwithdescendants',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Group and subgroup, group, link',
      '#el-29',
      {
        event: 'genericwithdescendants-custom-event',
        element_name: 'genericwithdescendants-custom-element-name',
        click_type: 'genericwithdescendants-custom-click-type',
        click_text: 'Link #29 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'genericwithdescendants',
        group_title: 'Heading #28 text group title of the component with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Group and subgroup, group, button',
      '#el-30',
      {
        event: 'genericwithdescendants-custom-event',
        element_name: 'genericwithdescendants-custom-element-name',
        click_type: 'genericwithdescendants-custom-click-type',
        click_text: 'Button #30 text with inner HTML',
        link_url: '',
        component_name: 'genericwithdescendants',
        group_title: 'Heading #28 text group title of the component with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Group and subgroup, subgroup, link',
      '#el-32',
      {
        event: 'genericwithdescendants-custom-event',
        element_name: 'genericwithdescendants-custom-element-name',
        click_type: 'genericwithdescendants-custom-click-type',
        click_text: 'Link #32 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'genericwithdescendants',
        group_title: 'Heading #31 text sub-group title of the component with inner HTML',
        subgroup_title: 'Heading #31 text sub-group title of the component with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Group and subgroup, subgroup, button',
      '#el-33',
      {
        event: 'genericwithdescendants-custom-event',
        element_name: 'genericwithdescendants-custom-element-name',
        click_type: 'genericwithdescendants-custom-click-type',
        click_text: 'Button #33 text with inner HTML',
        link_url: '',
        component_name: 'genericwithdescendants',
        group_title: 'Heading #31 text sub-group title of the component with inner HTML',
        subgroup_title: 'Heading #31 text sub-group title of the component with inner HTML',
        site_type: 'example',
      },
    ],
    [
      'Skipped heading',
      '#el-35',
      {
        event: 'click_secondary_interaction',
        element_name: 'genericskipped-link',
        click_type: 'link',
        click_text: 'Link #35 text',
        link_url: 'https://example.com',
        component_name: 'genericskipped',
        group_title: '',
        site_type: 'example',
      },
    ],
    [
      'Collector, search form',
      '#el-40',
      {
        event: 'click_search',
        element_name: 'search-form-cta',
        click_type: 'button',
        click_text: 'Button #40 Search',
        link_url: 'http://example.com',
        component_name: 'search form',
        site_type: 'example',
        search_term: 'keyword1 keyword2',
        filter_types_selected: 'Type 42',
        filter_tags_selected: 'Tag 45',
      },
    ],
    [
      'Collector, filters with defaults',
      '#el-50',
      {
        event: 'click_search_filter',
        element_name: 'search-filter-cta',
        click_type: 'button',
        click_text: 'Apply filters #50',
        link_url: 'http://example.com',
        component_name: 'search filter',
        site_type: 'example',
        search_term: 'keyword1 keyword2',
        filter_types_selected: 'Type 42',
        filter_tags_selected: 'Tag 45',
      },
    ],
    [
      'Collector, filters with mixed labels and values',
      '#el-50',
      {
        event: 'click_search_filter',
        element_name: 'search-filter-cta',
        click_type: 'button',
        click_text: 'Apply filters #50',
        link_url: 'http://example.com',
        component_name: 'search filter',
        site_type: 'example',
        search_term: 'keyword1 keyword2',
        filter_types_selected: 'Type 43',
        filter_tags_selected: 'Tag 45, Tag 46, tags_47',
      },
      () => {
        ['#el-43', '#el-46', '#el-47'].forEach((selector) => {
          document.querySelector(selector).checked = true;
        });
      },
    ],
  ])('tracks interaction for: %s', (_name, selector, expected, setup) => {
    if (setup) {
      setup();
    }

    trigger(selector);

    expect(window.dataLayer).toEqual([expected]);
  });

  it('pushes the object when the collector is missing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    trigger('#el-51');

    expect(error).toHaveBeenCalledWith('Function testCollectors.missing not found or not callable.');
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0].element_name).toBe('search-missing-collector-link');
  });

  it('binds delayed components once the expected value is set', async () => {
    const component = document.querySelector('[data-component="genericdelayed"]');

    trigger('#el-21');
    component.setAttribute('data-once', 'other');
    await flushMutations();
    trigger('#el-21');

    expect(window.dataLayer).toHaveLength(0);

    component.setAttribute('data-once', 'other delayedval');
    await flushMutations();
    trigger('#el-21');

    expect(window.dataLayer).toEqual([
      {
        event: 'click_secondary_interaction',
        element_name: 'genericdelayed-link',
        click_type: 'link',
        click_text: 'Link #21 text with inner HTML',
        link_url: 'https://example.com',
        component_name: 'genericdelayed',
        group_title: 'Panel 1',
        site_type: 'example',
      },
    ]);
  });

  it('ignores delayed components with no data-once value', async () => {
    const component = document.querySelector('[data-component="genericdelayed"]');

    component.setAttribute('data-once', '');
    component.removeAttribute('data-once');
    await flushMutations();
    trigger('#el-21');

    expect(window.dataLayer).toHaveLength(0);
  });

  it('binds each component only once', () => {
    acl.attach(document);
    acl.attach(document.body);

    trigger('#el-2');

    expect(window.dataLayer).toHaveLength(1);
  });

  it('preserves an existing data layer', () => {
    window.dataLayer = [{ event: 'existing' }];

    loadFixture();
    new AnalyticsContextLayer().attach(document);
    trigger('#el-2');

    expect(window.dataLayer).toHaveLength(2);
    expect(window.dataLayer[0]).toEqual({ event: 'existing' });
  });

  it('applies custom settings', () => {
    document.body.innerHTML = '<div data-component="custom"><a href="/a" class="btn" id="a">A</a><a href="/b" id="b">B</a></div>';
    delete window.customLayer;

    new AnalyticsContextLayer({ dataLayerName: 'customLayer', defaultEvent: 'interaction', buttonSelector: '.btn' }).attach();
    trigger('#a');
    trigger('#b');

    expect(window.customLayer.map(({ event, element_name, click_type }) => ({ event, element_name, click_type }))).toEqual([
      { event: 'interaction', element_name: 'custom-cta', click_type: 'button' },
      { event: 'interaction', element_name: 'custom-link', click_type: 'link' },
    ]);
  });

  it('enables debug from the URL hash and logs pushed data', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    window.location.hash = DEFAULT_SETTINGS.debugHash;

    loadFixture();
    const debugAcl = new AnalyticsContextLayer();
    debugAcl.attach(document);
    trigger('#el-2');

    expect(debugAcl.isDebug).toBe(true);
    expect(window.localStorage.getItem('analytics-debug')).toBe('1');
    expect(log).toHaveBeenCalledWith('[analytics] Debug enabled');
    expect(log).toHaveBeenCalledWith('[analytics] Data pushed to dataLayer', expect.stringContaining('"element_name": "generic-link"'));
  });

  it('keeps debug enabled from local storage without announcing it', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    window.localStorage.setItem('analytics-debug', '1');

    const debugAcl = new AnalyticsContextLayer();
    debugAcl.attach(document);

    expect(debugAcl.isDebug).toBe(true);
    expect(log).not.toHaveBeenCalledWith('[analytics] Debug enabled');
  });

  it.each([
    ['missing function', 'missing', {}],
    ['missing namespace', 'a.b.fn', {}],
    ['not a function', 'a.fn', { a: { fn: 'string' } }],
  ])('throws on exec of a %s', (_name, path, context) => {
    expect(() => acl.exec(path, context)).toThrow(`Function ${path} not found or not callable.`);
  });

  it('calls a function by its path', () => {
    const context = { a: { fn: (x, y) => x + y } };

    expect(acl.exec('a.fn', context, 1, 2)).toBe(3);
  });

  it('returns null field text when no fields match', () => {
    expect(acl.getFieldText('.does-not-exist')).toBeNull();
  });

  it('returns no group title for the container itself', () => {
    const container = document.querySelector('[data-component="generic"]');

    expect(acl.findGroupTitle(container, container)).toBe('');
  });

  it('returns null for an attribute absent from all ancestors', () => {
    expect(acl.getAttributeFromParent('data-does-not-exist', document.querySelector('#el-2'))).toBeNull();
  });
});
