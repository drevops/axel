/**
 * @file
 * Browser bundle entry point.
 *
 * Exposes the class as 'window.AnalyticsContextLayer' and a shared instance,
 * configured from 'window.analyticsContextLayerSettings', as
 * 'window.analyticsContextLayer'.
 */

import { AnalyticsContextLayer } from './acl.js';

const instance = new AnalyticsContextLayer(window.analyticsContextLayerSettings);

window.AnalyticsContextLayer = AnalyticsContextLayer;
window.analyticsContextLayer = instance;

if (instance.settings.autoAttach) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => instance.attach(document));
  } else {
    instance.attach(document);
  }
}
