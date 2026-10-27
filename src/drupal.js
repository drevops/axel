/**
 * @file
 * Drupal bundle entry point.
 *
 * Initializes the shared instance from 'drupalSettings.analyticsContextLayer'
 * in the 'analyticsContextLayer' behavior, and exposes the class as
 * 'window.AnalyticsContextLayer' and the instance as
 * 'window.analyticsContextLayer'.
 */

import { AnalyticsContextLayer, init } from './acl.js';

window.AnalyticsContextLayer = AnalyticsContextLayer;

Drupal.behaviors.analyticsContextLayer = {
  // Listeners are delegated to the document and init() is idempotent, so
  // every attach after the first, including AJAX ones, is a no-op.
  attach() {
    window.analyticsContextLayer = init(drupalSettings.analyticsContextLayer || {});
  },
};
