import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsContextLayer } from '../src/acl.js';
import { loadFixture } from './helpers.js';

function focus(selector) {
  document.querySelector(selector).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

describe('form_start', () => {
  let acl;

  beforeEach(() => {
    loadFixture('form-start');
    window.dataLayer = [];
    window.sessionStorage.clear();

    acl = new AnalyticsContextLayer({ types: ['form_start'] }).init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it.each([
    [
      'a form with an ID and an address',
      '#contact-name',
      {
        event: 'form_start',
        form_name: 'contact',
        form_id: 'contact',
        form_destination: 'http://localhost:3000/contact',
        form_type: 'enquiry',
        section: 'contact',
      },
    ],
    ['a marked wrapper without an ID or address', '#newsletter-email', { event: 'form_start', form_name: 'newsletter' }],
    ['a form without an address', '#callback-phone', { event: 'form_start', form_name: 'callback', form_id: 'callback' }],
  ])('sends 1 event for the first focus in %s', (_description, selector, expected) => {
    focus(selector);

    expect(window.dataLayer).toEqual([expected]);
  });

  it('sends 1 event per form however many fields are focused', () => {
    focus('#contact-name');
    focus('#contact-email');
    focus('#contact-name');
    focus('#callback-phone');

    expect(window.dataLayer.map((event) => event.form_name)).toEqual(['contact', 'callback']);
  });

  it('sends the event for a native focus', () => {
    document.querySelector('#contact-email').focus();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('starts the form on the next focus after a skipped field', () => {
    focus('#contact-skipped');

    expect(window.dataLayer).toHaveLength(0);

    focus('#contact-submit');

    expect(window.dataLayer).toHaveLength(1);
  });

  it.each([
    ['a field outside any marked form', '#unmarked-field'],
    ['the document itself', null],
  ])('sends no event for focus on %s', (_description, selector) => {
    const target = selector ? document.querySelector(selector) : document;

    target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });

  it('starts a form again once it is replaced', () => {
    focus('#callback-phone');
    document.querySelector('#callback').outerHTML = '<form id="callback" data-analytics-form="callback"><input id="callback-phone"></form>';
    focus('#callback-phone');

    expect(window.dataLayer).toHaveLength(2);
  });
});
