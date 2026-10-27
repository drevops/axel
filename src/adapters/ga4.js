/**
 * @file
 * Google Analytics 4 rules shared by the Google adapters.
 */

export const LIMITS = {
  eventName: 40,
  params: 25,
  paramValue: 100,
};

/**
 * Flag the parameters for GA4 DebugView in debug mode.
 *
 * @param {object}  params - The event parameters.
 * @param {boolean} debug  - Whether debug mode is on.
 * @return {object} The parameters, with 'debug_mode' in debug mode.
 */
export function withDebugMode(params, debug) {
  return debug ? { ...params, debug_mode: true } : params;
}

/**
 * Check an event against the GA4 collection limits.
 *
 * @param {string} name   - The event name.
 * @param {object} params - The event parameters.
 * @return {string[]} A warning per exceeded limit.
 */
export function validate(name, params) {
  const warnings = [];

  if (name.length > LIMITS.eventName) {
    warnings.push(`event name is longer than ${LIMITS.eventName} characters.`);
  }

  if (Object.keys(params).length > LIMITS.params) {
    warnings.push(`more than ${LIMITS.params} parameters.`);
  }

  Object.entries(params)
    .filter(([, value]) => String(value).length > LIMITS.paramValue)
    .forEach(([key]) => warnings.push(`"${key}" is longer than ${LIMITS.paramValue} characters.`));

  return warnings;
}

/**
 * Get the data layer array, creating it when missing.
 *
 * @param {object} settings - The instance settings.
 * @return {Array} The data layer.
 */
export function getDataLayer(settings) {
  const name = settings.dataLayerName || 'dataLayer';

  window[name] = window[name] || [];

  return window[name];
}
