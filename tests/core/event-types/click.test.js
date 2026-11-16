import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../../src/adapters/gtm.js';
import { Axel } from '../../../src/core/core.js';
import { loadFixture, runStep } from '../../helpers.js';

// The behavior of each kind of element is covered by the cases in
// tests/fixtures/cases.html; these tests cover what the page can't express.
describe('click', () => {
  let axel;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    axel = new Axel({ adapter: gtm }).init();
  });

  afterEach(() => {
    axel.destroy();
    delete window.dataLayer;
  });

  it('sends no event for a click dispatched on the document itself', () => {
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });

  it('sends the event when a handler on the page stops the click', () => {
    document.querySelector('#click-link').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    document.querySelector('#click-link').click();

    expect(window.dataLayer).toHaveLength(1);
  });

  it('tracks elements matching a custom click selector', () => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, clickSelector: 'p' }).init();

    document.querySelector('#click-text').click();
    document.querySelector('#click-link').click();

    expect(window.dataLayer).toEqual([{ event: 'component_click', link_text: 'Plain text', click_type: 'button', component: 'promo' }]);
  });

  it('titles a group with headings matching a custom group title selector', () => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, groupTitleSelector: 'h5' }).init();

    document.querySelector('#group-closest-h5').click();
    document.querySelector('#group-marker-link').click();

    expect(window.dataLayer.map((event) => event.group_title)).toEqual(['Not a title', 'Latest news']);
  });

  it('leaves text matching the hidden text selector out of link text and titles, then falls back to the full text', () => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, hiddenTextSelector: '.visually-hidden' }).init();

    ['#hidden-text-suffix', '#hidden-text-title', '#hidden-text-label', '#hidden-text-only'].forEach((selector) => document.querySelector(selector).click());

    expect(window.dataLayer.map((event) => ({ link_text: event.link_text, group_title: event.group_title, subgroup_title: event.subgroup_title }))).toEqual([
      { link_text: 'Docs', group_title: 'Resources', subgroup_title: 'Guides' },
      { link_text: 'GitHub', group_title: 'Resources', subgroup_title: 'Guides' },
      { link_text: 'LinkedIn', group_title: 'Resources', subgroup_title: 'Guides' },
      { link_text: 'Close', group_title: 'Resources', subgroup_title: 'Guides' },
    ]);
  });

  it('keeps the full text of a title that matches the hidden text selector as a whole', () => {
    document.querySelector('#hidden-text-suffix').insertAdjacentHTML('beforebegin', '<h3 class="visually-hidden">Hidden heading</h3>');
    axel.destroy();
    axel = new Axel({ adapter: gtm, hiddenTextSelector: '.visually-hidden' }).init();

    document.querySelector('#hidden-text-suffix').click();

    expect(window.dataLayer[0].group_title).toBe('Hidden heading');
  });

  it('keeps query strings and contact addresses with the full URLs setting', () => {
    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['click', 'form_start'], fullUrls: true }).init();

    document.querySelector('#privacy-url-query').click();
    document.querySelector('#privacy-url-mailto').click();
    document.querySelector('#privacy-url-submit').click();
    document.querySelector('#privacy-url-field').focus();

    expect(window.dataLayer.map((event) => event.link_url || event.form_destination)).toEqual([
      'http://localhost:3000/reset?token=abc&email=jane%40example.com#form',
      'mailto:jane@example.com?subject=Hello',
      'http://localhost:3000/subscribe?email=jane%40example.com',
      'http://localhost:3000/apply?ref=jane%40example.com',
    ]);
  });

  it.each([
    [{}, ['https://example.com/blog/post', 'https://example.com/subscribe', 'https://example.com/apply', 'https://example.com/apply']],
    [
      { fullUrls: true },
      [
        'https://example.com/blog/post?page=2',
        'https://example.com/subscribe?list=news',
        'https://example.com/apply?ref=jane',
        'https://example.com/apply?ref=jane',
      ],
    ],
    [
      { keepUrlCredentials: true },
      [
        'https://jane:secret@example.com/blog/post',
        'https://jane:secret@example.com/subscribe',
        'https://jane:secret@example.com/apply',
        'https://jane:secret@example.com/apply',
      ],
    ],
  ])('resolves relative URLs against a base URL with credentials with %j', (settings, expected) => {
    const base = document.createElement('base');

    base.href = 'https://jane:secret@example.com/';
    document.head.append(base);
    document.querySelector('#privacy-url-query').setAttribute('href', 'blog/post?page=2');
    document.querySelector('#privacy-url-submit').form.setAttribute('action', 'subscribe?list=news');
    document.querySelector('#privacy-url-form').setAttribute('action', 'apply?ref=jane');

    axel.destroy();
    axel = new Axel({ adapter: gtm, types: ['click', 'form_start', 'field_complete'], ...settings }).init();

    try {
      document.querySelector('#privacy-url-query').click();
      document.querySelector('#privacy-url-submit').click();
      runStep({ action: 'fill', target: '#privacy-url-field', value: 'Jane' });
    } finally {
      base.remove();
    }

    expect(window.dataLayer.map((event) => event.link_url || event.form_destination)).toEqual(expected);
  });

  it('stops sending events once destroyed', () => {
    axel.destroy();
    document.querySelector('#click-link').click();
    document.querySelector('#click-mouse').dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));

    expect(window.dataLayer).toHaveLength(0);
  });
});
