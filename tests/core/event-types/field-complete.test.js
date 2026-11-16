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

  it('stops sending events once destroyed', () => {
    axel.destroy();
    document.querySelector('#field-name').dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });
});
