/**
 * @file
 * The 'form_start' event for the first focus inside a marked form.
 */

import { formParams, isSkipped, listen } from '../dom.js';

/**
 * Track the first focus inside each marked form.
 *
 * @param {import('../core.js').Axel} axel - The instance.
 * @return {Function} A function that stops tracking.
 */
export function formStart(axel) {
  const started = new WeakSet();

  return listen('focusin', (event) => {
    const form = event.target instanceof Element ? event.target.closest('[data-axel-form]') : null;

    if (!form || started.has(form) || isSkipped(event.target)) {
      return;
    }

    started.add(form);
    axel.track('form_start', form, formParams(form, axel.settings.fullUrls));
  });
}
