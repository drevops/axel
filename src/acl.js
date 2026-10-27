/**
 * @file
 * Analytics Context Layer.
 *
 * Turns interactions with elements marked with 'data-analytics-*' attributes
 * into events and sends them to a sink. README.md describes the attributes.
 */

import { collectParams } from './dom.js';
import { createSink } from './sinks.js';
import { click } from './types/click.js';
import { fieldComplete } from './types/field-complete.js';
import { formStart } from './types/form-start.js';
import { formSubmit } from './types/form-submit.js';

export const TYPES = {
  click,
  form_start: formStart,
  field_complete: fieldComplete,
  form_submit: formSubmit,
};

// GA4 collection limits, checked in debug mode only.
export const LIMITS = {
  eventName: 40,
  params: 25,
  paramValue: 100,
};

export const DEFAULT_SETTINGS = {
  // Event types to track, as keys of TYPES.
  types: ['click'],
  // 'dataLayer', 'gtag' or a function that receives the name and parameters.
  sink: 'dataLayer',
  dataLayerName: 'dataLayer',
  // Static parameters added to every event, overridden by all others.
  properties: {},
  // Elements whose clicks are tracked.
  clickSelector: 'a[href], button, input[type="submit"], input[type="button"]',
  debugHash: '#analytics-debug',
  debugStorageKey: 'analyticsDebug',
  // Used by the browser bundle only.
  autoInit: true,
};

export class AnalyticsContextLayer {
  /**
   * @param {object} settings - Overrides for DEFAULT_SETTINGS.
   */
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.sink = createSink(this.settings.sink, this.settings.dataLayerName);

    this.settings.types.forEach((type) => {
      if (!Object.keys(TYPES).includes(type)) {
        throw new Error(`Unknown analytics event type "${type}".`);
      }
    });

    this.cleanups = null;
  }

  /**
   * Start tracking the configured event types.
   *
   * Calling it again on an initialized instance does nothing.
   *
   * @return {AnalyticsContextLayer} The instance.
   */
  init() {
    if (!this.cleanups) {
      this.cleanups = this.settings.types.map((type) => TYPES[type](this));
    }

    return this;
  }

  /**
   * Stop tracking. The instance can be initialized again afterwards.
   */
  destroy() {
    this.cleanups?.forEach((cleanup) => cleanup());
    this.cleanups = null;

    if (shared === this) {
      shared = null;
    }
  }

  /**
   * Send an event with the parameters of the element and its ancestors.
   *
   * @param {string}  name    - The event name.
   * @param {Element} element - The element the event is about.
   * @param {object}  derived - Parameters derived from the element, which
   *   'data-analytics-param-*' attributes override.
   */
  track(name, element, derived = {}) {
    this.send(name, { ...derived, ...collectParams(element) });
  }

  /**
   * Send a 'form_submit' event for a submission the server has confirmed.
   *
   * @param {string} formName - The form name.
   * @param {object} params   - Additional parameters.
   */
  formSubmitted(formName, params = {}) {
    this.send('form_submit', { form_name: formName, ...params });
  }

  /**
   * Send an event to the sink.
   *
   * @param {string} name   - The event name.
   * @param {object} params - The event parameters.
   */
  send(name, params) {
    const event = { ...this.settings.properties, ...params };

    if (this.isDebug()) {
      // GA4 lists events flagged with 'debug_mode' in its DebugView.
      event.debug_mode = true;
      console.log('[analytics]', name, event);
      this.warnLimits(name, event);
    }

    this.sink(name, event);
  }

  /**
   * Check whether events are logged for debugging.
   *
   * The debug hash turns logging on until the browser tab closes, so it holds
   * on the pages that clicks open.
   *
   * @return {boolean} TRUE if debugging.
   */
  isDebug() {
    const { debugHash, debugStorageKey } = this.settings;
    const requested = window.location.hash === debugHash;

    try {
      if (requested) {
        window.sessionStorage.setItem(debugStorageKey, '1');
      }

      return requested || window.sessionStorage.getItem(debugStorageKey) === '1';
    } catch {
      // A browser that blocks storage throws on access.
      return requested;
    }
  }

  /**
   * Warn about an event that exceeds the GA4 limits.
   *
   * @param {string} name   - The event name.
   * @param {object} params - The event parameters.
   */
  warnLimits(name, params) {
    const warn = (message) => console.warn(`[analytics] ${name}: ${message}`);

    if (name.length > LIMITS.eventName) {
      warn(`event name is longer than ${LIMITS.eventName} characters.`);
    }

    if (Object.keys(params).length > LIMITS.params) {
      warn(`more than ${LIMITS.params} parameters.`);
    }

    Object.entries(params)
      .filter(([, value]) => String(value).length > LIMITS.paramValue)
      .forEach(([key]) => warn(`"${key}" is longer than ${LIMITS.paramValue} characters.`));
  }
}

let shared = null;

/**
 * Initialize the shared instance.
 *
 * The first call creates the instance from the settings; later calls return it
 * and ignore their settings.
 *
 * @param {object} settings - Overrides for DEFAULT_SETTINGS.
 * @return {AnalyticsContextLayer} The shared instance.
 */
export function init(settings = {}) {
  shared = shared || new AnalyticsContextLayer(settings);

  return shared.init();
}
