/**
 * @file
 * Browser bundle entry point.
 *
 * Exposes the class as 'window.AnalyticsContextLayer' and the shared instance,
 * configured from 'window.analyticsContextLayerSettings', as
 * 'window.analyticsContextLayer'.
 */

import { AnalyticsContextLayer, init } from './acl.js';

const settings = window.analyticsContextLayerSettings || {};

window.AnalyticsContextLayer = AnalyticsContextLayer;

// Listeners are delegated to the document, so the DOM does not need to be
// ready and clicks are tracked before other scripts load.
window.analyticsContextLayer = settings.autoInit === false ? new AnalyticsContextLayer(settings) : init(settings);
