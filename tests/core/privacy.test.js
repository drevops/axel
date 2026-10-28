import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../src/adapters/gtm.js';
import { Acl } from '../../src/core/core.js';
import { loadFixture } from '../helpers.js';

// Typed and chosen values are covered by the privacy cases in
// tests/fixtures/cases.html; this test needs a custom click selector.
describe('privacy', () => {
  let acl;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it('sends no typed value when the click selector matches a text input', () => {
    document.querySelector('#privacy-name').closest('form').setAttribute('data-acl-event', 'form_click');
    acl = new Acl({ adapter: gtm, clickSelector: 'input' }).init();

    const field = document.querySelector('#privacy-name');

    field.value = 'Jane Citizen';
    field.click();

    expect(window.dataLayer).toEqual([{ event: 'form_click', link_text: '', click_type: 'button' }]);
  });
});
