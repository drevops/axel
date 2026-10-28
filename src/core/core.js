/**
 * @file
 * Analytics Context Layer core.
 *
 * Turns interactions with elements marked with 'data-acl-*' attributes into
 * events and hands them to an adapter. README.md describes the attributes and
 * the adapter contract.
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
  clickSelector: 'a[href], button, input[type="submit"], input[type="button"], input[type="reset"]',
  // Headings that title a data-acl-group when it has no marker.
  groupTitleSelector: 'h2, h3, h4',
  // Functions named by data-acl-collector, as name => function.
  collectors: {},
  debugHash: '#acl-debug',
  debugStorageKey: 'aclDebug',
  // Used by the standalone integration only.
  autoInit: true,
};

export class Acl {
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

    Object.entries(this.settings.collectors).forEach(([name, collector]) => {
      if (typeof collector !== 'function') {
        throw new Error(`The analytics collector "${name}" must be a function.`);
      }
    });

    this.cleanups = null;
  }

  /**
   * Start tracking the configured event types.
   *
   * Calling it again on an initialized instance does nothing.
   *
   * @return {Acl} The instance.
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
   *   'data-acl-param-*' attributes override.
   */
  track(name, element, derived = {}) {
    const params = { ...derived, ...collectParams(element) };

    this.send(name, { ...params, ...this.collect(name, params, element) });
  }

  /**
   * Run the collector named by the closest 'data-acl-collector'.
   *
   * A failing collector adds nothing, so the event is still sent.
   *
   * @param {string}  name    - The event name.
   * @param {object}  params  - The event parameters, passed as a copy.
   * @param {Element} element - The element the event is about.
   * @return {object} The parameters the collector returns.
   */
  collect(name, params, element) {
    const source = element.closest('[data-acl-collector]');

    if (!source) {
      return {};
    }

    const collectorName = source.getAttribute('data-acl-collector');

    try {
      // Only own keys, so a name such as 'toString' can't reach the prototype.
      if (!Object.hasOwn(this.settings.collectors, collectorName)) {
        throw new Error(`Unknown analytics collector "${collectorName}".`);
      }

      const collected = this.settings.collectors[collectorName](name, { ...params }, { element, source });

      if (collected === undefined || collected === null) {
        return {};
      }

      if (typeof collected !== 'object' || Array.isArray(collected)) {
        throw new Error(`The analytics collector "${collectorName}" must return an object.`);
      }

      return collected;
    } catch (error) {
      console.error(`[acl] ${error.message}`);

      return {};
    }
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
      console.log('[acl]', name, event);
      (this.adapter.validate?.(name, event) || []).forEach((warning) => console.warn(`[acl] ${name}: ${warning}`));
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
 * @return {Acl} The shared instance.
 */
export function init(settings = {}) {
  shared = shared || new Acl(settings);

  return shared.init();
}
