/**
 * @file
 * The 'field_complete' event for a changed field inside a marked form.
 */

import { formParams, getTextLabel, isSkipped, listen } from '../dom.js';

/**
 * Get the label of a field without its value.
 *
 * An option's label is the answer, so radios and checkboxes in a fieldset are
 * named by the fieldset legend, and a radio never by its own label.
 *
 * @param {Element} field   - The field.
 * @param {object}  options - The options of getTextLabel().
 * @return {string} The label, or an empty string.
 */
function getFieldLabel(field, options) {
  const legend = ['checkbox', 'radio'].includes(field.type) ? field.closest('fieldset')?.querySelector(':scope > legend') : null;
  const label = legend || (field.type === 'radio' ? null : field.labels?.[0]);
  const fallback = field.getAttribute('aria-label') || '';

  return label ? getTextLabel(label, field, fallback, options) : fallback;
}

/**
 * Track changes to fields inside marked forms.
 *
 * @param {import('../core.js').Axel} axel - The instance.
 * @return {Function} A function that stops tracking.
 */
export function fieldComplete(axel) {
  return listen('change', (event) => {
    const field = event.target;
    const form = field instanceof Element ? field.closest('[data-axel-form]') : null;

    if (!form || isSkipped(field)) {
      return;
    }

    const params = formParams(form, axel.settings);

    if (field.name) {
      params.field_name = field.name;
    }

    params.field_label = getFieldLabel(field, axel.labelOptions);

    axel.track('field_complete', field, params);
  });
}
