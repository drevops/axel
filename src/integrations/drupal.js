/**
 * @file
 * Drupal integration: starts in a behavior from 'drupalSettings'.
 */

import { Axel, init } from '../core/core.js';

/**
 * Register the 'axel' behavior and expose the class on 'window'.
 *
 * The behavior initializes the shared instance from 'drupalSettings.axel' and
 * exposes it as 'window.axel'. 'drupalSettings' can't hold functions, so the
 * collectors come from 'window.axelCollectors'.
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

      window.axel = init({ ...settings, collectors, adapter: adapter || window.axelAdapter });
    },
  };
}
