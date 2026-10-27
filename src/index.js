/**
 * @file
 * ES module entry point.
 */

export { AnalyticsContextLayer, DEFAULT_SETTINGS, TYPES, init } from './core/core.js';
export { gtag } from './adapters/gtag.js';
export { gtm } from './adapters/gtm.js';
