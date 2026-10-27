/**
 * @file
 * Analytics Context Layer core.
 *
 * Turns interactions with elements marked with 'data-analytics-*' attributes
 * into events and hands them to an adapter. README.md describes the attributes
 * and the adapter contract.
 */

import { collectParams } from './dom.js';
import { click } from './event-types/click.js';
import { fieldComplete } from './event-types/field-complete.js';
import { formStart } from './event-types/form-start.js';
import { formSubmit } from './event-types/form-submit.js';

export const TYPES = {
  click,
  form_start: formStart,
  field_complete: fieldComplete,
  form_submit: formSubmit,
};

export const DEFAULT_SETTINGS = {
  // Event types to track, as keys of TYPES.
  types: ['click'],
  // An object with send(name, params, context) and an optional
  // validate(name, params), or a function used as send().
  adapter: null,
  // Static parameters added to every event, overridden by all others.
  properties: {},
  // Elements whose clicks are tracked.
  clickSelector: 'a[href], button, input[type="submit"], input[type="button"]',
  debugHash: '#analytics-debug',
  debugStorageKey: 'analyticsDebug',
  // Used by the standalone integration only.
  autoInit: true,
};

export class AnalyticsContextLayer {
  /**
   * @param {object} settings - Overrides for DEFAULT_SETTINGS.
   */
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };

    const { adapter } = this.settings;

    this.adapter = typeof adapter === 'function' ? { send: adapter } : adapter;

    if (typeof this.adapter?.send !== 'function') {
      throw new Error('The analytics adapter must be a function or an object with a send() function.');
    }

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
   * Send an event to the adapter.
   *
   * @param {string} name   - The event name.
   * @param {object} params - The event parameters.
   */
  send(name, params) {
    const event = { ...this.settings.properties, ...params };
    const debug = this.isDebug();

    if (debug) {
      console.log('[analytics]', name, event);
      (this.adapter.validate?.(name, event) || []).forEach((warning) => console.warn(`[analytics] ${name}: ${warning}`));
    }

    this.adapter.send(name, event, { debug, settings: this.settings });
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
