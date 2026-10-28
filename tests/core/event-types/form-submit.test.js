import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../../src/adapters/gtm.js';
import { Acl } from '../../../src/core/core.js';
import { flushMutations, loadFixture } from '../../helpers.js';

const CONFIRMATION = '<p data-acl-form-submitted="newsletter">Subscribed.</p>';

// The behavior of each kind of confirmation is covered by the cases in
// tests/fixtures/cases.html; these tests cover what the page can't express.
describe('form_submit', () => {
  let acl;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    acl = new Acl({ adapter: gtm, types: ['form_submit'] }).init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it('ignores added text', async () => {
    document.querySelector('#submit-ajax-wrapper').append('Text');
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends 1 event per marker when it is moved', async () => {
    document.querySelector('#submit-ajax-wrapper').append(document.querySelector('[data-acl-form-submitted="contact"]'));
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends 1 event per marker when initialized again', () => {
    acl.init();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('stops watching for markers once destroyed', async () => {
    acl.destroy();
    document.querySelector('#submit-ajax-wrapper').innerHTML = CONFIRMATION;
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends the event from the hook when the type is not enabled', () => {
    new Acl({ adapter: gtm, types: [] }).formSubmitted('callback');

    expect(window.dataLayer.at(-1)).toEqual({ event: 'form_submit', form_name: 'callback' });
  });
});
