import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../../src/adapters/gtm.js';
import { Axel } from '../../../src/core/core.js';
import { flushMutations, loadFixture } from '../../helpers.js';

const CONFIRMATION = '<p data-axel-form-submitted="newsletter">Subscribed.</p>';

// The behavior of each kind of confirmation is covered by the cases in
// tests/fixtures/cases.html; these tests cover what the page can't express.
describe('form_submit', () => {
  let axel;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    axel = new Axel({ adapter: gtm, types: ['form_submit'] }).init();
  });

  afterEach(() => {
    axel.destroy();
    delete window.dataLayer;
  });

  it('ignores added text', async () => {
    document.querySelector('#submit-ajax-wrapper').append('Text');
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends 1 event per marker when it is moved', async () => {
    document.querySelector('#submit-ajax-wrapper').append(document.querySelector('[data-axel-form-submitted="contact"]'));
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends 1 event per marker when initialized again', () => {
    axel.init();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('stops watching for markers once destroyed', async () => {
    axel.destroy();
    document.querySelector('#submit-ajax-wrapper').innerHTML = CONFIRMATION;
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends the event from the hook when the type is not enabled', () => {
    new Axel({ adapter: gtm, types: [] }).formSubmitted('callback');

    expect(window.dataLayer.at(-1)).toEqual({ event: 'form_submit', form_name: 'callback' });
  });
});
