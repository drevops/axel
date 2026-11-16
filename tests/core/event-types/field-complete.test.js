import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gtm } from '../../../src/adapters/gtm.js';
import { Axel } from '../../../src/core/core.js';
import { loadFixture } from '../../helpers.js';

// The behavior of each kind of field is covered by the cases in
// tests/fixtures/cases.html; these tests cover what the page can't express.
describe('field_complete', () => {
  let axel;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    axel = new Axel({ adapter: gtm, types: ['field_complete'] }).init();
  });

  afterEach(() => {
    axel.destroy();
    delete window.dataLayer;
  });

  it('sends no event for a change dispatched on the document itself', () => {
    document.dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });

  it('leaves text matching the hidden text selector out of the label, then falls back to aria-label and the full text', () => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['field_complete'], hiddenTextSelector: '.visually-hidden' }).init();

    ['#field-hidden-suffix', '#field-hidden-label', '#field-hidden-aria'].forEach((selector) =>
      document.querySelector(selector).dispatchEvent(new Event('change', { bubbles: true })),
    );

    expect(window.dataLayer.map((event) => event.field_label)).toEqual(['Suburb', 'Search', 'Postal code']);
  });

  it('sends the label the label filter returns, then falls back to aria-label when it returns an empty string', () => {
    const labelFilter = vi.fn((label) => label.replace(/\s*\(required\)$/, '').replace('Postcode', ''));

    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['field_complete'], labelFilter }).init();

    ['#field-hidden-suffix', '#field-hidden-aria'].forEach((selector) =>
      document.querySelector(selector).dispatchEvent(new Event('change', { bubbles: true })),
    );

    expect(window.dataLayer.map((event) => event.field_label)).toEqual(['Suburb', 'Postal code']);
    expect(labelFilter).toHaveBeenCalledWith('Suburb (required)', document.querySelector('#field-hidden-suffix'));
  });

  it('sends the form ID from the first listed attribute with a value', () => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['field_complete'], formIdAttributes: ['data-drupal-selector', 'id'] }).init();
    document.body.innerHTML = '<form id="contact--a1B2" data-drupal-selector="contact" data-axel-form="contact"><input id="field" name="name"></form>';

    document.querySelector('#field').dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer).toEqual([{ event: 'field_complete', form_name: 'contact', form_id: 'contact', field_name: 'name', field_label: '' }]);
  });

  it('stops sending events once destroyed', () => {
    axel.destroy();
    document.querySelector('#field-name').dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });
});
