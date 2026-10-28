/**
 * @file
 * Drupal integration: starts in a behavior from 'drupalSettings'.
 */

import { Acl, init } from '../core/core.js';

/**
 * Register the 'acl' behavior and expose the class on 'window'.
 *
 * The behavior initializes the shared instance from 'drupalSettings.acl' and
 * exposes it as 'window.acl'. 'drupalSettings' can't hold functions, so the
 * collectors come from 'window.aclCollectors'.
 *
 * @param {object} [adapter] - The adapter. Defaults to 'window.aclAdapter' as
 *   defined when the behavior attaches.
 */
export function start(adapter) {
  window.Acl = Acl;

  window.Drupal.behaviors.acl = {
    // Listeners are delegated to the document and init() is idempotent, so
    // every attach after the first, including AJAX ones, is a no-op.
    attach() {
      const settings = window.drupalSettings.acl;
      const collectors = { ...window.aclCollectors, ...settings?.collectors };

      window.acl = init({ ...settings, collectors, adapter: adapter || window.aclAdapter });
    },
  };
}
