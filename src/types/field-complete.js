/**
 * @file
 * The 'field_complete' event for a changed field inside a marked form.
 */

import { formParams, getText, isSkipped, listen } from '../dom.js';

/**
 * Get the label of a field without its value.
 *
 * An option's label is the answer, so radios and checkboxes in a fieldset are
 * named by the fieldset legend, and a radio never by its own label.
 *
 * @param {Element} field - The field.
 * @return {string} The label, or an empty string.
 */
function getFieldLabel(field) {
  const legend = ['checkbox', 'radio'].includes(field.type) ? field.closest('fieldset')?.querySelector(':scope > legend') : null;
  const label = legend || (field.type === 'radio' ? null : field.labels?.[0]);

  return (label ? getText(label).replace(/\s+/g, ' ').trim() : '') || field.getAttribute('aria-label') || '';
}

/**
 * Track changes to fields inside marked forms.
 *
 * @param {import('../acl.js').AnalyticsContextLayer} acl - The instance.
 * @return {Function} A function that stops tracking.
 */
export function fieldComplete(acl) {
  return listen('change', (event) => {
    const field = event.target;
    const form = field instanceof Element ? field.closest('[data-analytics-form]') : null;

    if (!form || isSkipped(field)) {
      return;
    }

    const params = formParams(form);

    if (field.name) {
      params.field_name = field.name;
    }

    params.field_label = getFieldLabel(field);

    acl.track('field_complete', field, params);
  });
}
