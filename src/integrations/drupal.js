/**
 * @file
 * Drupal integration: starts in a behavior from 'drupalSettings'.
 */

import { AnalyticsContextLayer, init } from '../core/core.js';

/**
 * Register the 'analyticsContextLayer' behavior and expose the class on
 * 'window'.
 *
 * The behavior initializes the shared instance from
 * 'drupalSettings.analyticsContextLayer' and exposes it as
 * 'window.analyticsContextLayer'. 'drupalSettings' can't hold functions, so the
 * collectors come from 'window.analyticsContextLayerCollectors'.
 *
 * @param {object} [adapter] - The adapter. Defaults to
 *   'window.analyticsContextLayerAdapter' as defined when the behavior attaches.
 */
export function start(adapter) {
  window.AnalyticsContextLayer = AnalyticsContextLayer;

  window.Drupal.behaviors.analyticsContextLayer = {
    // Listeners are delegated to the document and init() is idempotent, so
    // every attach after the first, including AJAX ones, is a no-op.
    attach() {
      const settings = window.drupalSettings.analyticsContextLayer;
      const collectors = { ...window.analyticsContextLayerCollectors, ...settings?.collectors };

      window.analyticsContextLayer = init({ ...settings, collectors, adapter: adapter || window.analyticsContextLayerAdapter });
    },
  };
}
