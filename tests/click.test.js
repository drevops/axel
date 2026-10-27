import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsContextLayer } from '../src/acl.js';
import { loadFixture } from './helpers.js';

describe('click', () => {
  let acl;

  beforeEach(() => {
    loadFixture('click');
    window.gtag = vi.fn();
    window.history.pushState({}, '', '/pricing');
    window.sessionStorage.clear();

    acl = new AnalyticsContextLayer({ sink: 'gtag' }).init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.gtag;
    delete window.dataLayer;
    vi.restoreAllMocks();
  });

  it.each([
    [
      'a link in an enrolled element',
      '#enrolled-link',
      'component_click',
      { link_text: 'Get your contract reviewed', link_url: 'http://localhost:3000/same-day-review', component: 'hero' },
    ],
    ['a phone link', '#enrolled-phone', 'component_click', { link_text: '(03) 9534 3422', link_url: 'tel:0395343422', component: 'hero' }],
    ['a link to another site', '#enrolled-other-site', 'component_click', { link_text: 'Book a call', link_url: 'https://example.com/book', component: 'hero' }],
    [
      'a link to a section of the page',
      '#enrolled-section',
      'component_click',
      { link_text: 'Send an enquiry', link_url: 'http://localhost:3000/pricing#form', component: 'hero' },
    ],
    ['a button', '#enrolled-button', 'component_click', { link_text: 'Menu', component: 'hero' }],
    ['a submit input', '#enrolled-submit', 'component_click', { link_text: 'Send', component: 'hero' }],
    ['an input button', '#enrolled-input-button', 'component_click', { link_text: 'Clear', component: 'hero' }],
    [
      'a link in an element nested in another',
      '#nested-inner',
      'component_click',
      {
        link_text: 'Request Fixed-Fee Quote: Buying a Property',
        link_url: 'http://localhost:3000/services/buying',
        component: 'icon_card',
        layout: 'grid_left',
      },
    ],
    [
      'a link in the outer element',
      '#nested-outer',
      'component_click',
      { link_text: 'Ask a Question', link_url: 'http://localhost:3000/contact', component: 'section', layout: 'grid_left' },
    ],
    [
      'a link in a nested element that names another event',
      '#nested-event',
      'card_click',
      { link_text: 'Selling', link_url: 'http://localhost:3000/services/selling', component: 'section', layout: 'grid_left' },
    ],
    [
      'a link that names its own event and parameter',
      '#element-event',
      'enquiry_click',
      { link_text: 'Enquire Now', link_url: 'http://localhost:3000/contact', component: 'section', layout: 'grid_left', position: '2' },
    ],
    [
      'a parameter that replaces the link text',
      '#element-text-param',
      'component_click',
      { link_text: 'Custom text', link_url: 'http://localhost:3000/contact', component: 'section', layout: 'grid_left' },
    ],
    ['a link whose text spans lines around a hidden icon and a comment', '#text-hidden', 'component_click', { link_text: 'Contact us', link_url: 'http://localhost:3000/contact' }],
    ['a link named by its label', '#text-label', 'component_click', { link_text: 'Call the office', link_url: 'tel:0395343422' }],
    ['a link named by its title', '#text-title', 'component_click', { link_text: 'Contact the office', link_url: 'http://localhost:3000/contact' }],
    ['a link with no text or label', '#text-none', 'component_click', { link_text: '', link_url: 'http://localhost:3000/contact' }],
  ])('sends 1 event for %s', (_description, selector, name, params) => {
    document.querySelector(selector).click();

    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', name, params);
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

    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends no event for a click dispatched on the document itself', () => {
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends the event for a click on an element inside the link', () => {
    document.querySelector('#nested-inner .visually-hidden').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(window.gtag).toHaveBeenCalledWith('event', 'component_click', expect.objectContaining({ link_text: 'Request Fixed-Fee Quote: Buying a Property' }));
  });

  it('sends the event when a handler on the page stops the click', () => {
    document.querySelector('#enrolled-link').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    document.querySelector('#enrolled-link').click();

    expect(window.gtag).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['middle click', 1, 1],
    ['right click', 0, 2],
  ])('a %s on an enrolled link sends %i event(s)', (_description, calls, button) => {
    document.querySelector('#enrolled-link').dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button }));

    expect(window.gtag).toHaveBeenCalledTimes(calls);
  });

  it('tracks elements matching a custom click selector', () => {
    acl.destroy();
    acl = new AnalyticsContextLayer({ sink: 'gtag', clickSelector: 'p' }).init();

    document.querySelector('#enrolled-text span').click();
    document.querySelector('#enrolled-link').click();

    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'component_click', { link_text: 'Plain text', component: 'hero' });
  });

  it('stops sending events once destroyed', () => {
    acl.destroy();
    document.querySelector('#enrolled-link').click();
    document.querySelector('#enrolled-link').dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));

    expect(window.gtag).not.toHaveBeenCalled();
  });
});
