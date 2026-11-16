/**
 * @file
 * Axel core.
 *
 * Turns interactions with elements marked with 'data-axel-*' attributes into
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
  // Headings that title a data-axel-group when it has no marker.
  groupTitleSelector: 'h2, h3, h4',
  // Elements whose text labels leave out, such as visually hidden text.
  hiddenTextSelector: '',
  // A function(label, element) that returns the label to send.
  labelFilter: null,
  // Functions named by data-axel-collector, as name => function.
  collectors: {},
  // Keep query strings and contact addresses in link_url and form_destination.
  fullUrls: false,
  // Keep the username and password in link_url and form_destination.
  keepUrlCredentials: false,
  debugHash: '#axel-debug',
  debugStorageKey: 'axelDebug',
  // Used by the standalone integration only.
  autoInit: true,
};

export class Axel {
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

    const { labelFilter } = this.settings;

    if (labelFilter !== null && labelFilter !== undefined && typeof labelFilter !== 'function') {
      throw new Error('The analytics label filter must be a function.');
    }

    this.labelOptions = { hiddenSelector: this.settings.hiddenTextSelector, filter: (label, element) => this.filterLabel(label, element) };
    this.cleanups = null;
    this.sendHandlers = new Set();
  }

  /**
   * Start tracking the configured event types.
   *
   * Calling it again on an initialized instance does nothing.
   *
   * @return {Axel} The instance.
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
   *   'data-axel-param-*' attributes override.
   */
  track(name, element, derived = {}) {
    const params = { ...derived, ...collectParams(element) };

    this.send(name, { ...params, ...this.collect(name, params, element) });
  }

  /**
   * Run the collector named by the closest 'data-axel-collector'.
   *
   * A failing collector adds nothing, so the event is still sent.
   *
   * @param {string}  name    - The event name.
   * @param {object}  params  - The event parameters, passed as a copy.
   * @param {Element} element - The element the event is about.
   * @return {object} The parameters the collector returns.
   */
  collect(name, params, element) {
    const source = element.closest('[data-axel-collector]');

    if (!source) {
      return {};
    }

    const collectorName = source.getAttribute('data-axel-collector');

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
      console.error(`[axel] ${error.message}`);

      return {};
    }
  }

  /**
   * Run the 'labelFilter' setting on a label.
   *
   * A failing filter keeps the label as it is, so the event is still sent.
   *
   * @param {string}  label   - The label with whitespace collapsed.
   * @param {Element} element - The element the label names.
   * @return {string} The label to send.
   */
  filterLabel(label, element) {
    const { labelFilter } = this.settings;

    if (!labelFilter) {
      return label;
    }

    try {
      const filtered = labelFilter(label, element);

      if (typeof filtered !== 'string') {
        throw new Error('The analytics label filter must return a string.');
      }

      return filtered;
    } catch (error) {
      // A site's filter can throw a value that isn't an Error, such as null.
      console.error(`[axel] ${error?.message ?? error}`);

      return label;
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
      console.log('[axel]', name, event);
      (this.adapter.validate?.(name, event) || []).forEach((warning) => console.warn(`[axel] ${name}: ${warning}`));
    }

    this.adapter.send(name, event, { debug, settings: this.settings });
    this.sendHandlers.forEach((handler) => handler(name, event));
  }

  /**
   * Call a function after every event is sent to the adapter.
   *
   * @param {Function} handler - Called with the event name and parameters.
   * @return {Function} A function that removes the handler.
   */
  onSend(handler) {
    this.sendHandlers.add(handler);

    return () => this.sendHandlers.delete(handler);
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
 * @return {Axel} The shared instance.
 */
export function init(settings = {}) {
  shared = shared || new Axel(settings);

  return shared.init();
}
