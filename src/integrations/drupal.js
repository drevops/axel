/**
 * @file
 * Drupal integration: starts in a behavior from 'drupalSettings'.
 */

import { Axel, init } from '../core/core.js';

// Drupal appends a random '--' suffix to a form 'id' on every AJAX rebuild,
// and 'data-drupal-selector' holds the form ID without it.
const FORM_ID_ATTRIBUTES = ['data-drupal-selector', 'id'];

/**
 * Register the 'axel' behavior and expose the class on 'window'.
 *
 * The behavior initializes the shared instance from 'drupalSettings.axel' and
 * exposes it as 'window.axel'. 'drupalSettings' can't hold functions, so the
 * collectors come from 'window.axelCollectors' and the label filter from
 * 'window.axelLabelFilter'. 'formIdAttributes' defaults to
 * 'data-drupal-selector', then 'id'.
 *
 * @param {object} [adapter] - The adapter. Defaults to 'window.axelAdapter' as
 *   defined when the behavior attaches.
 */
export function start(adapter) {
  window.Axel = Axel;

  window.Drupal.behaviors.axel = {
    // Listeners are delegated to the document and init() is idempotent, so
    // every attach after the first, including AJAX ones, is a no-op.
    attach() {
      const settings = window.drupalSettings.axel;
      const collectors = { ...window.axelCollectors, ...settings?.collectors };

      window.axel = init({
        formIdAttributes: FORM_ID_ATTRIBUTES,
        ...settings,
        collectors,
        labelFilter: window.axelLabelFilter,
        adapter: adapter || window.axelAdapter,
      });
    },
  };
}
