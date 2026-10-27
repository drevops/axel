import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsContextLayer } from '../src/acl.js';
import { loadFixture } from './helpers.js';

function change(selector) {
  document.querySelector(selector).dispatchEvent(new Event('change', { bubbles: true }));
}

const FORM = { event: 'field_complete', form_name: 'apply', form_id: 'apply', form_destination: 'http://localhost:3000/apply' };

describe('field_complete', () => {
  let acl;

  beforeEach(() => {
    loadFixture('field-complete');
    window.dataLayer = [];
    window.sessionStorage.clear();

    acl = new AnalyticsContextLayer({ types: ['field_complete'] }).init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it.each([
    ['a field named by a label with hidden text', '#apply-name', { field_name: 'full_name', field_label: 'Full name' }],
    ['a field inside its label', '#apply-phone', { field_name: 'phone', field_label: 'Phone' }],
    ['a textarea', '#apply-message', { field_name: 'message', field_label: 'Message' }],
    ['a select', '#apply-state', { field_name: 'state', field_label: 'State' }],
    ['a radio in a fieldset', '#apply-method-phone', { field_name: 'method', field_label: 'Contact method' }],
    ['a radio outside a fieldset', '#apply-callback-yes', { field_name: 'callback', field_label: '' }],
    ['a radio outside a fieldset with an ARIA label', '#apply-callback-labelled', { field_name: 'callback', field_label: 'Callback' }],
    ['a checkbox outside a fieldset', '#apply-terms', { field_name: 'terms', field_label: 'I accept the terms' }],
    ['a field named by its ARIA label', '#apply-aria', { field_name: 'reference', field_label: 'Reference number' }],
    ['a field with a label parameter and no name', '#apply-unnamed', { field_label: 'Custom label' }],
    ['a field with no name or label', '#apply-bare', { field_label: '' }],
  ])('sends 1 event for %s', (_description, selector, params) => {
    change(selector);

    expect(window.dataLayer).toEqual([{ ...FORM, ...params }]);
  });

  it('sends 1 event per change', () => {
    change('#apply-name');
    change('#apply-name');

    expect(window.dataLayer).toHaveLength(2);
  });

  it.each([
    ['a field outside any marked form', '#unmarked-field'],
    ['a skipped field', '#apply-skipped'],
  ])('sends no event for %s', (_description, selector) => {
    change(selector);

    expect(window.dataLayer).toHaveLength(0);
  });

  it('sends no event for a change dispatched on the document itself', () => {
    document.dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });
});
