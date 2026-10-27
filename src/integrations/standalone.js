/**
 * @file
 * Standalone integration: starts on load from page settings.
 */

import { Axel, init } from '../core/core.js';

/**
 * Initialize from 'window.axelSettings' unless 'autoInit' is false, and expose
 * the class and the instance on 'window'.
 *
 * The collectors in 'window.axelCollectors' are added to the collectors in the
 * settings.
 *
 * @param {object} [adapter] - The adapter. Defaults to 'window.axelAdapter'.
 */
export function start(adapter) {
  const pageSettings = window.axelSettings;
  const collectors = { ...window.axelCollectors, ...pageSettings?.collectors };
  const settings = { ...pageSettings, collectors, adapter: adapter || window.axelAdapter };

  window.Axel = Axel;

  // Listeners are delegated to the document, so the DOM does not need to be
  // ready and clicks are tracked before other scripts load.
  window.axel = settings.autoInit === false ? new Axel(settings) : init(settings);
}
