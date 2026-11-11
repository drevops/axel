/**
 * @file
 * DOM helpers shared by the event types.
 */

const PARAM_PREFIX = 'data-axel-param-';

// The rest of a URL with these schemes is an address or a phone number.
const CONTACT_PROTOCOLS = ['mailto:', 'tel:', 'sms:'];

/**
 * Add a capture-phase listener to the document.
 *
 * @param {string}   type    - The DOM event type.
 * @param {Function} handler - The listener.
 * @return {Function} A function that removes the listener.
 */
export function listen(type, handler) {
  document.addEventListener(type, handler, true);

  return () => document.removeEventListener(type, handler, true);
}

/**
 * Get the text of a node, without what assistive technology skips.
 *
 * Form controls contribute no text, so a field value never ends up in a label.
 *
 * @param {Node} node - The node.
 * @return {string} The text of the node and its descendants.
 */
export function getText(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE || node.getAttribute('aria-hidden') === 'true' || node.matches('select, textarea')) {
    return '';
  }

  return [...node.childNodes].map(getText).join('');
}

/**
 * Get the text that names an element in the reports.
 *
 * @param {Element} element - The element.
 * @return {string} The text with whitespace collapsed, or the element's label
 *   when it has no text.
 */
export function getLabel(element) {
  // Only a button input's value is its label; any other input value is typed.
  const isButton = element instanceof HTMLInputElement && ['submit', 'button', 'reset'].includes(element.type);
  const value = isButton ? element.value : getText(element);

  return value.replace(/\s+/g, ' ').trim() || element.getAttribute('aria-label') || element.getAttribute('title') || '';
}

/**
 * Collect the 'data-axel-param-*' values of the element and its ancestors.
 *
 * @param {Element} element - The element to start from.
 * @return {object} The parameters, the closest of each name winning.
 */
export function collectParams(element) {
  const params = {};

  for (let node = element; node; node = node.parentElement) {
    [...node.attributes]
      .filter((attribute) => attribute.name.startsWith(PARAM_PREFIX))
      .forEach((attribute) => {
        const name = attribute.name.slice(PARAM_PREFIX.length).replace(/-/g, '_');

        if (params[name] === undefined) {
          params[name] = attribute.value;
        }
      });
  }

  return params;
}

/**
 * Check if the element or an ancestor opts out of tracking.
 *
 * @param {Element} element - The element.
 * @return {boolean} TRUE if the element is skipped.
 */
export function isSkipped(element) {
  return element.closest('[data-axel-skip]') !== null;
}

/**
 * Resolve a URL attribute of an element against the page.
 *
 * The attribute is read directly because a form field named like a form
 * property, such as 'action' or 'id', shadows that property on the form.
 *
 * Unless 'fullUrl' is set, the query string is dropped and a 'mailto:', 'tel:'
 * or 'sms:' URL is reduced to its scheme, because both often hold personal
 * information.
 *
 * @param {Element} element   - The element.
 * @param {string}  attribute - The attribute name.
 * @param {boolean} fullUrl   - Whether to keep the URL as it is.
 * @return {string|undefined} The absolute URL, or undefined when the value
 *   isn't a valid URL.
 */
export function resolveUrl(element, attribute, fullUrl = false) {
  let url;

  try {
    url = new URL(element.getAttribute(attribute), element.baseURI);
  } catch {
    return undefined;
  }

  if (fullUrl) {
    return url.href;
  }

  if (CONTACT_PROTOCOLS.includes(url.protocol)) {
    return url.protocol;
  }

  url.search = '';

  return url.href;
}

/**
 * Get the parameters that describe a marked form.
 *
 * @param {Element} form    - The element with 'data-axel-form'.
 * @param {boolean} fullUrl - Whether to keep the destination URL as it is.
 * @return {object} The form name, and the form ID and destination when known.
 */
export function formParams(form, fullUrl = false) {
  const params = { form_name: form.getAttribute('data-axel-form') };
  const id = form.getAttribute('id');

  if (id) {
    params.form_id = id;
  }

  const destination = form instanceof HTMLFormElement && form.hasAttribute('action') ? resolveUrl(form, 'action', fullUrl) : undefined;

  if (destination !== undefined) {
    params.form_destination = destination;
  }

  return params;
}
