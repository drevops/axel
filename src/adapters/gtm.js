/**
 * @file
 * Adapter that pushes events to the data layer for Google Tag Manager.
 */

import { getDataLayer, validate, withDebugMode } from './ga4.js';

export const gtm = {
  send(name, params, { debug, settings }) {
    getDataLayer(settings).push({ ...withDebugMode(params, debug), event: name });
  },
  validate,
};
