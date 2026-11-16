import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MARKUP = '<div data-axel-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';

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
    window.axel?.destroy();
    delete window.Drupal;
    delete window.drupalSettings;
    delete window.axelAdapter;
    delete window.axelCollectors;
    delete window.axelLabelFilter;
    delete window.axel;
    delete window.Axel;
  });

  function attach(context = document) {
    window.Drupal.behaviors.axel.attach(context);
  }

  it('initializes the shared instance from drupalSettings once however many times the behavior attaches', async () => {
    window.drupalSettings.axel = { properties: { site: 'example' } };

    start(adapter);
    const { Axel, init } = await import('../../src/core/core.js');

    expect(window.Axel).toBe(Axel);
    expect(window.axel).toBeUndefined();

    attach();
    attach(document.body);
    document.querySelector('#link').click();

    expect(window.axel).toBe(init());
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

    expect(window.axel.settings.types).toEqual(['click']);
  });

  it('uses the page collectors defined before the behavior attaches', () => {
    const page = vi.fn();

    start(adapter);
    window.axelCollectors = { page };
    attach();

    expect(window.axel.settings.collectors).toEqual({ page });
  });

  it('uses the page label filter defined before the behavior attaches', () => {
    start(adapter);
    window.axelLabelFilter = (label) => label.replace(/^Li/, 'Sh');
    attach();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledWith('cta_click', expect.objectContaining({ link_text: 'Shnk' }), expect.any(Object));
  });

  it('reads the form ID from data-drupal-selector, then id, by default', () => {
    start(adapter);
    attach();

    expect(window.axel.settings.formIdAttributes).toEqual(['data-drupal-selector', 'id']);
  });

  it('reads the form ID from the attributes in drupalSettings', () => {
    window.drupalSettings.axel = { formIdAttributes: ['id'] };

    start(adapter);
    attach();

    expect(window.axel.settings.formIdAttributes).toEqual(['id']);
  });

  it('sends the same form ID after an AJAX response redraws the form with a new id', () => {
    const form = (id) => `<form id="${id}" data-drupal-selector="contact-form" data-axel-form="contact"><input id="field" name="name"></form>`;

    window.drupalSettings.axel = { types: ['form_start', 'field_complete'] };
    document.body.innerHTML = form('contact-form');

    start(adapter);
    attach();
    document.querySelector('#field').focus();
    document.querySelector('#contact-form').outerHTML = form('contact-form--sKry3dUurl4');
    attach(document.body);
    document.querySelector('#field').dispatchEvent(new Event('change', { bubbles: true }));

    expect(adapter.send.mock.calls.map(([name, params]) => [name, params.form_id])).toEqual([
      ['form_start', 'contact-form'],
      ['field_complete', 'contact-form'],
    ]);
  });

  it('uses the page adapter defined before the behavior attaches', () => {
    start();
    window.axelAdapter = adapter;
    attach();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });
});
