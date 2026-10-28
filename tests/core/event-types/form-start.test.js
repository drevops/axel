import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../../src/adapters/gtm.js';
import { Axel } from '../../../src/core/core.js';
import { loadFixture } from '../../helpers.js';

// The behavior of each kind of form is covered by the cases in
// tests/fixtures/cases.html; these tests cover what the page can't express.
describe('form_start', () => {
  let axel;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    axel = new Axel({ adapter: gtm, types: ['form_start'] }).init();
  });

  afterEach(() => {
    axel.destroy();
    delete window.dataLayer;
  });

  it('sends no event for focus dispatched on the document itself', () => {
    document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });

  it('starts a form again once it is replaced', () => {
    document.querySelector('#form-start-phone').focus();
    document.querySelector('#form-start-callback').outerHTML = '<form id="form-start-callback" data-axel-form="callback"><input id="form-start-phone"></form>';
    document.querySelector('#form-start-phone').focus();

    expect(window.dataLayer).toHaveLength(2);
  });
});
