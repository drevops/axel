import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsContextLayer, TYPES } from '../src/acl.js';

const SECRET = 'Jane Citizen 0412 345 678';

const MARKUP = `
  <section data-analytics-event="form_click">
    <form id="private" action="/private" data-analytics-form="private">
      <label>Name <input id="text" type="text" name="name"></label>
      <label for="email">Email</label>
      <input id="email" type="email" name="email">
      <label for="message">Message</label>
      <textarea id="message" name="message">${SECRET} pre-filled</textarea>
      <label>Answer
        <select id="select" name="answer">
          <option>Other</option>
          <option>${SECRET} option</option>
        </select>
      </label>
      <fieldset>
        <legend>Situation</legend>
        <input id="radio" type="radio" name="situation" value="1">
        <label for="radio">${SECRET} radio</label>
      </fieldset>
      <fieldset>
        <legend>Needs</legend>
        <label><input id="checkbox" type="checkbox" name="needs[]" value="1">${SECRET} checkbox</label>
      </fieldset>
      <button id="submit" type="submit">Send</button>
    </form>
  </section>
`;

describe('privacy', () => {
  let acl;

  beforeEach(() => {
    document.body.innerHTML = MARKUP;
    window.dataLayer = [];
    window.sessionStorage.clear();

    acl = new AnalyticsContextLayer({ types: Object.keys(TYPES) }).init();
  });

  afterEach(() => {
    acl.destroy();
    delete window.dataLayer;
  });

  it.each([
    ['a text field', '#text', (field) => (field.value = SECRET)],
    ['an email field', '#email', (field) => (field.value = SECRET)],
    ['a textarea', '#message', (field) => (field.value = `${SECRET} typed`)],
    ['a select', '#select', (field) => (field.selectedIndex = 1)],
    ['a radio', '#radio', (field) => (field.checked = true)],
    ['a checkbox', '#checkbox', (field) => (field.checked = true)],
  ])('sends no value typed or chosen in %s', (_description, selector, fill) => {
    const field = document.querySelector(selector);

    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fill(field);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#submit').click();
    acl.formSubmitted('private');

    expect(window.dataLayer.map((event) => event.event)).toEqual(['form_start', 'field_complete', 'form_click', 'form_submit']);
    expect(JSON.stringify(window.dataLayer)).not.toContain('Jane');
  });

  it('sends no textarea content inside a clicked link', () => {
    document.querySelector('#text').closest('label').insertAdjacentHTML('beforeend', '<a id="help" href="/help">Help <textarea>Jane</textarea></a>');
    document.querySelector('#help').click();

    expect(window.dataLayer).toEqual([{ event: 'form_click', link_text: 'Help', link_url: 'http://localhost:3000/help' }]);
  });
});
