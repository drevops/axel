import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  it('stops sending events once destroyed', () => {
    axel.destroy();
    document.querySelector('#field-name').dispatchEvent(new Event('change', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });
});
