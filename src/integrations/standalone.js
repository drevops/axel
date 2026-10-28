/**
 * @file
 * Standalone integration: starts on load from page settings.
 */

import { AnalyticsContextLayer, init } from '../core/core.js';

/**
 * Initialize from 'window.analyticsContextLayerSettings' unless 'autoInit' is
 * false, and expose the class and the instance on 'window'.
 *
 * The collectors in 'window.analyticsContextLayerCollectors' are added to the
 * collectors in the settings.
 *
 * @param {object} [adapter] - The adapter. Defaults to
 *   'window.analyticsContextLayerAdapter'.
 */
export function start(adapter) {
  const pageSettings = window.analyticsContextLayerSettings;
  const collectors = { ...window.analyticsContextLayerCollectors, ...pageSettings?.collectors };
  const settings = { ...pageSettings, collectors, adapter: adapter || window.analyticsContextLayerAdapter };

  window.AnalyticsContextLayer = AnalyticsContextLayer;

  // Listeners are delegated to the document, so the DOM does not need to be
  // ready and clicks are tracked before other scripts load.
  window.analyticsContextLayer = settings.autoInit === false ? new AnalyticsContextLayer(settings) : init(settings);
}
