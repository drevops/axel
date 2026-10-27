import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FIXTURE = join(import.meta.dirname, 'fixtures', 'cases.html');

/**
 * Replace the document body with the body of the cases page.
 *
 * The page also runs in a browser, so its scripts are left out.
 */
export function loadFixture() {
  const html = readFileSync(FIXTURE, 'utf8');

  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
}

/**
 * Wait for pending mutation observer callbacks.
 *
 * @return {Promise<void>} Resolves on the next task.
 */
export function flushMutations() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Each step dispatches what a browser fires for the same interaction.
const ACTIONS = {
  click: (element) => element.click(),
  'middle-click': (element) => element.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })),
  'right-click': (element) => element.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 2 })),
  focus: (element) => element.focus(),
  change: (element) => element.dispatchEvent(new Event('change', { bubbles: true })),
  fill: (element, value) => {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  },
  check: (element) => {
    element.focus();
    element.click();
  },
  select: (element, value) => {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  },
  insert: (element, value) => element.append(document.querySelector(value).content.cloneNode(true)),
};

/**
 * Run a case step in jsdom.
 *
 * @param {object} step - A step from readCases().
 */
export function runStep({ action, target, value }) {
  if (action === 'hook') {
    window.axel.formSubmitted(target, JSON.parse(value));

    return;
  }

  ACTIONS[action](document.querySelector(target), value);
}
