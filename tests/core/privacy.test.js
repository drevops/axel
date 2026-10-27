import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../src/adapters/gtm.js';
import { Axel } from '../../src/core/core.js';
import { loadFixture } from '../helpers.js';

// Typed and chosen values are covered by the privacy cases in
// tests/fixtures/cases.html; this test needs a custom click selector.
describe('privacy', () => {
  let axel;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();
  });

  afterEach(() => {
    axel.destroy();
    delete window.dataLayer;
  });

  it('sends no typed value when the click selector matches a text input', () => {
    document.querySelector('#privacy-name').closest('form').setAttribute('data-axel-event', 'form_click');
    axel = new Axel({ adapter: gtm, clickSelector: 'input' }).init();

    const field = document.querySelector('#privacy-name');

    field.value = 'Jane Citizen';
    field.click();

    expect(window.dataLayer).toEqual([{ event: 'form_click', link_text: '', click_type: 'button' }]);
  });
});
