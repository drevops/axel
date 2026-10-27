import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsContextLayer } from '../src/acl.js';
import { flushMutations, loadFixture } from './helpers.js';

describe('form_submit', () => {
  let acl;

  beforeEach(() => {
    loadFixture('form-submit');
    window.dataLayer = [];
    window.sessionStorage.clear();

    acl = new AnalyticsContextLayer({ types: ['form_submit'] }).init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it('sends 1 event for a marker rendered with the page and none for a skipped one', () => {
    expect(window.dataLayer).toEqual([{ event: 'form_submit', form_name: 'contact', form_type: 'enquiry' }]);
  });

  it('sends 1 event for a marker added later', async () => {
    document.querySelector('#ajax-wrapper').innerHTML = '<p data-analytics-form-submitted="newsletter">Subscribed.</p>';
    await flushMutations();

    expect(window.dataLayer.at(-1)).toEqual({ event: 'form_submit', form_name: 'newsletter', section: 'newsletter' });
  });

  it('sends 1 event for a marker nested in added markup', async () => {
    document.querySelector('#ajax-wrapper').innerHTML = '<div><p data-analytics-form-submitted="newsletter">Subscribed.</p></div>';
    await flushMutations();

    expect(window.dataLayer.at(-1).form_name).toBe('newsletter');
  });

  it('ignores added text and markup without a marker', async () => {
    document.querySelector('#ajax-wrapper').append('Text', document.createElement('p'));
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends 1 event per marker when it is moved', async () => {
    document.querySelector('#ajax-wrapper').append(document.querySelector('#contact-confirmation'));
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends 1 event per marker when initialized again', () => {
    acl.init();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('stops watching for markers once destroyed', async () => {
    acl.destroy();
    document.querySelector('#ajax-wrapper').innerHTML = '<p data-analytics-form-submitted="newsletter">Subscribed.</p>';
    await flushMutations();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('sends the event from the hook the site calls', () => {
    acl.formSubmitted('callback', { form_step: '2' });

    expect(window.dataLayer.at(-1)).toEqual({ event: 'form_submit', form_name: 'callback', form_step: '2' });
  });

  it('sends the event from the hook when the type is not enabled', () => {
    const other = new AnalyticsContextLayer({ types: [] });

    other.formSubmitted('callback');

    expect(window.dataLayer.at(-1)).toEqual({ event: 'form_submit', form_name: 'callback' });
  });
});
