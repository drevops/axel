/**
 * @file
 * Adapter that sends events through the Google tag.
 */

import { getDataLayer, validate, withDebugMode } from './ga4.js';

export const gtag = {
  send(name, params, { debug, settings }) {
    const event = withDebugMode(params, debug);

    if (typeof window.gtag === 'function') {
      window.gtag('event', name, event);

      return;
    }

    const dataLayer = getDataLayer(settings);

    // The Google tag reads only arguments objects from the data layer, so the
    // event is queued the way its own gtag() function does.
    (function queue() {
      dataLayer.push(arguments);
    })('event', name, event);
  },
  validate,
};
