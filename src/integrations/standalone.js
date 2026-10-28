/**
 * @file
 * Standalone integration: starts on load from page settings.
 */

import { Acl, init } from '../core/core.js';

/**
 * Initialize from 'window.aclSettings' unless 'autoInit' is false, and expose
 * the class and the instance on 'window'.
 *
 * The collectors in 'window.aclCollectors' are added to the collectors in the
 * settings.
 *
 * @param {object} [adapter] - The adapter. Defaults to 'window.aclAdapter'.
 */
export function start(adapter) {
  const pageSettings = window.aclSettings;
  const collectors = { ...window.aclCollectors, ...pageSettings?.collectors };
  const settings = { ...pageSettings, collectors, adapter: adapter || window.aclAdapter };

  window.Acl = Acl;

  // Listeners are delegated to the document, so the DOM does not need to be
  // ready and clicks are tracked before other scripts load.
  window.acl = settings.autoInit === false ? new Acl(settings) : init(settings);
}
