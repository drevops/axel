import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../../src/adapters/gtm.js';
import { Axel } from '../../../src/core/core.js';
import { flushMutations, loadFixture } from '../../helpers.js';

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

  it('starts a form again after the instance is initialized again', () => {
    document.querySelector('#form-start-phone').focus();
    document.querySelector('#form-start-phone').blur();
    axel.destroy();
    axel.init();
    document.querySelector('#form-start-phone').focus();

    expect(window.dataLayer).toHaveLength(2);
  });

  it.each([
    ['starts a form again after a confirmation marker for its name', 'callback', ['form_start', 'form_submit', 'form_start']],
    ['keeps a form started after a confirmation marker for another name', 'newsletter', ['form_start', 'form_submit']],
  ])('%s', async (_title, submitted, expected) => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['form_start', 'form_submit'] }).init();
    window.dataLayer = [];

    document.querySelector('#form-start-phone').focus();
    document.querySelector('#form-start-phone').blur();
    document.querySelector('#submit-ajax-wrapper').innerHTML = `<p data-axel-form-submitted="${submitted}">Thanks.</p>`;
    await flushMutations();
    document.querySelector('#form-start-phone').focus();

    expect(window.dataLayer.map((event) => event.event)).toEqual(expected);
  });

  it('starts a form again after a submission under its overridden name', () => {
    document.querySelector('#form-start-callback').setAttribute('data-axel-param-form-name', 'lead');

    document.querySelector('#form-start-phone').focus();
    document.querySelector('#form-start-phone').blur();
    axel.formSubmitted('lead');
    document.querySelector('#form-start-phone').focus();

    expect(window.dataLayer.map((event) => `${event.event}:${event.form_name}`)).toEqual(['form_start:lead', 'form_submit:lead', 'form_start:lead']);
  });

  it.each([
    [
      'sends the first listed attribute with a value as form_id',
      ['data-drupal-selector', 'id'],
      { 'data-drupal-selector': 'contact', id: 'contact--a1B2' },
      { form_id: 'contact' },
    ],
    ['falls back to the next attribute when the first is missing', ['data-drupal-selector', 'id'], { id: 'contact' }, { form_id: 'contact' }],
    [
      'falls back to the next attribute when the first is empty',
      ['data-drupal-selector', 'id'],
      { 'data-drupal-selector': '', id: 'contact' },
      { form_id: 'contact' },
    ],
    ['sends no form_id when no listed attribute has a value', ['data-drupal-selector'], { id: 'contact' }, {}],
    ['sends no form_id when the list is empty', [], { id: 'contact' }, {}],
  ])('%s', (_title, formIdAttributes, attributes, expected) => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['form_start'], formIdAttributes }).init();
    document.body.innerHTML = '<form data-axel-form="contact"><input id="field" name="name"></form>';
    Object.entries(attributes).forEach(([name, value]) => document.querySelector('form').setAttribute(name, value));

    document.querySelector('#field').focus();

    expect(window.dataLayer).toEqual([{ event: 'form_start', form_name: 'contact', ...expected }]);
  });

  it('stops watching for submissions once destroyed', () => {
    axel.destroy();

    expect(axel.sendHandlers.size).toBe(0);
  });
});
