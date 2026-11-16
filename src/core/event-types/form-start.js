/**
 * @file
 * The 'form_start' event for the first focus inside each named form.
 */

import { collectParams, formParams, isSkipped, listen } from '../dom.js';

/**
 * Track the first focus inside each marked form.
 *
 * Forms are told apart by name, so a form an AJAX response redraws as a new
 * element doesn't start again. A 'form_submit' for the name ends the attempt,
 * so the next focus starts the form again.
 *
 * @param {import('../core.js').Axel} axel - The instance.
 * @return {Function} A function that stops tracking.
 */
export function formStart(axel) {
  const started = new Set();

  const stopListening = listen('focusin', (event) => {
    const form = event.target instanceof Element ? event.target.closest('[data-axel-form]') : null;
    if (!form || isSkipped(event.target)) {
      return;
    }

    const params = formParams(form, axel.settings);
    // Key on the sent name, so a 'form_submit' under the same name matches.
    const name = collectParams(form).form_name ?? params.form_name;

    if (started.has(name)) {
      return;
    }

    started.add(name);
    axel.track('form_start', form, params);
  });

  const stopWatching = axel.onSend((name, params) => {
    if (name === 'form_submit') {
      started.delete(params.form_name);
    }
  });

  return () => {
    stopListening();
    stopWatching();
  };
}
