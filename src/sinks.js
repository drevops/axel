/**
 * @file
 * Destinations that receive the events.
 */

/**
 * Create a sink that pushes '{event, ...params}' objects to the data layer.
 *
 * @param {string} dataLayerName - Name of the data layer array on 'window'.
 * @return {Function} The sink.
 */
export function dataLayerSink(dataLayerName) {
  return (name, params) => {
    window[dataLayerName] = window[dataLayerName] || [];
    window[dataLayerName].push({ event: name, ...params });
  };
}

/**
 * Create a sink that sends events through the Google tag.
 *
 * @param {string} dataLayerName - Name of the data layer array on 'window'.
 * @return {Function} The sink.
 */
export function gtagSink(dataLayerName) {
  return (name, params) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);

      return;
    }

    window[dataLayerName] = window[dataLayerName] || [];

    // The Google tag reads only arguments objects from the data layer, so the
    // event is queued the way its own gtag() function does.
    (function queue() {
      window[dataLayerName].push(arguments);
    })('event', name, params);
  };
}

/**
 * Resolve the sink setting to a function.
 *
 * @param {string|Function} sink          - 'dataLayer', 'gtag' or a function
 *   that receives the event name and parameters.
 * @param {string}          dataLayerName - Name of the data layer array.
 * @return {Function} The sink.
 */
export function createSink(sink, dataLayerName) {
  if (typeof sink === 'function') {
    return sink;
  }

  if (sink === 'dataLayer') {
    return dataLayerSink(dataLayerName);
  }

  if (sink === 'gtag') {
    return gtagSink(dataLayerName);
  }

  throw new Error(`Unknown analytics sink "${sink}".`);
}
