import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsContextLayer } from '../src/acl.js';
import { loadFixture } from './helpers.js';

const ORIGIN = 'http://localhost:3000';

function middleClick(selector, button = 1) {
  document.querySelector(selector).dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button }));
}

describe('click', () => {
  let acl;

  beforeEach(() => {
    loadFixture('click');
    window.dataLayer = [];
    window.history.pushState({}, '', '/page');
    window.sessionStorage.clear();

    acl = new AnalyticsContextLayer().init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it.each([
    ['a link in an enrolled element', '#enrolled-link', { event: 'component_click', link_text: 'See the deals', link_url: `${ORIGIN}/sale`, component: 'promo' }],
    ['a phone link', '#enrolled-phone', { event: 'component_click', link_text: '02 0000 0000', link_url: 'tel:0200000000', component: 'promo' }],
    [
      'a link to another site',
      '#enrolled-other-site',
      { event: 'component_click', link_text: 'Visit our partner', link_url: 'https://example.com/partner', component: 'promo' },
    ],
    [
      'a link to a section of the page',
      '#enrolled-section',
      { event: 'component_click', link_text: 'Jump to the form', link_url: `${ORIGIN}/page#form`, component: 'promo' },
    ],
    ['a button', '#enrolled-button', { event: 'component_click', link_text: 'Menu', component: 'promo' }],
    ['a submit input', '#enrolled-submit', { event: 'component_click', link_text: 'Subscribe', component: 'promo' }],
    ['an input button', '#enrolled-input-button', { event: 'component_click', link_text: 'Clear', component: 'promo' }],
    [
      'a link in an element nested in another',
      '#nested-inner',
      { event: 'component_click', link_text: 'Read more: Spring sale', link_url: `${ORIGIN}/sale/spring`, component: 'card', layout: 'grid' },
    ],
    ['a link in the outer element', '#nested-outer', { event: 'component_click', link_text: 'About us', link_url: `${ORIGIN}/about`, component: 'section', layout: 'grid' }],
    [
      'a link in a nested element that names another event',
      '#nested-event',
      { event: 'card_click', link_text: 'Summer sale', link_url: `${ORIGIN}/sale/summer`, component: 'section', layout: 'grid' },
    ],
    [
      'a link that names its own event and parameter',
      '#element-event',
      { event: 'contact_click', link_text: 'Get in touch', link_url: `${ORIGIN}/contact`, component: 'section', layout: 'grid', position: '2' },
    ],
    [
      'a parameter that replaces the link text',
      '#element-text-param',
      { event: 'component_click', link_text: 'Custom text', link_url: `${ORIGIN}/contact`, component: 'section', layout: 'grid' },
    ],
    ['a link whose text spans lines around a hidden icon and a comment', '#text-hidden', { event: 'component_click', link_text: 'Contact us', link_url: `${ORIGIN}/contact` }],
    ['a link named by its label', '#text-label', { event: 'component_click', link_text: 'Call us', link_url: 'tel:0200000000' }],
    ['a link named by its title', '#text-title', { event: 'component_click', link_text: 'Contact the team', link_url: `${ORIGIN}/contact` }],
    ['a link with no text or label', '#text-none', { event: 'component_click', link_text: '', link_url: `${ORIGIN}/contact` }],
  ])('sends 1 event for %s', (_description, selector, expected) => {
    document.querySelector(selector).click();

    expect(window.dataLayer).toEqual([expected]);
  });

  it.each([
    ['a link outside any enrolled element', '#outside-link'],
    ['a button outside any enrolled element', '#outside-button'],
    ['an anchor without an address', '#enrolled-no-address'],
    ['a click on text that is not a link or a button', '#enrolled-text span'],
    ['a skipped link', '#skip-link'],
    ['a link in a skipped element', '#skip-container-link'],
  ])('sends no event for %s', (_description, selector) => {
    document.querySelector(selector).click();

    expect(window.dataLayer).toHaveLength(0);
  });

  it('sends no event for a click dispatched on the document itself', () => {
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.dataLayer).toHaveLength(0);
  });

  it('sends the event for a click on an element inside the link', () => {
    document.querySelector('#nested-inner .visually-hidden').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(window.dataLayer).toEqual([expect.objectContaining({ link_text: 'Read more: Spring sale' })]);
  });

  it('sends the event when a handler on the page stops the click', () => {
    document.querySelector('#enrolled-link').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    document.querySelector('#enrolled-link').click();

    expect(window.dataLayer).toHaveLength(1);
  });

  it.each([
    ['middle click', 1, 1],
    ['right click', 0, 2],
  ])('a %s on an enrolled link sends %i event(s)', (_description, events, button) => {
    middleClick('#enrolled-link', button);

    expect(window.dataLayer).toHaveLength(events);
  });

  it('tracks elements matching a custom click selector', () => {
    acl.destroy();
    acl = new AnalyticsContextLayer({ clickSelector: 'p' }).init();

    document.querySelector('#enrolled-text span').click();
    document.querySelector('#enrolled-link').click();

    expect(window.dataLayer).toEqual([{ event: 'component_click', link_text: 'Plain text', component: 'promo' }]);
  });

  it('stops sending events once destroyed', () => {
    acl.destroy();
    document.querySelector('#enrolled-link').click();
    middleClick('#enrolled-link');

    expect(window.dataLayer).toHaveLength(0);
  });
});
