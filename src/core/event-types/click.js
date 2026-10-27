/**
 * @file
 * Click events for interactive elements inside 'data-analytics-event'.
 */

import { getLabel, isSkipped, listen } from '../dom.js';

/**
 * Track clicks and middle clicks.
 *
 * @param {import('../core.js').AnalyticsContextLayer} acl - The instance.
 * @return {Function} A function that stops tracking.
 */
export function click(acl) {
  const track = (event) => {
    const element = event.target instanceof Element ? event.target.closest(acl.settings.clickSelector) : null;

    if (!element || isSkipped(element)) {
      return;
    }

    const enrolled = element.closest('[data-analytics-event]');

    if (!enrolled) {
      return;
    }

    const params = { link_text: getLabel(element) };

    if (element instanceof HTMLAnchorElement) {
      params.link_url = element.href;
    }

    acl.track(enrolled.getAttribute('data-analytics-event'), element, params);
  };

  // Capture runs before any handler on the page can stop a click from
  // reaching the document.
  const removers = [
    listen('click', track),
    // A middle click opens a link in a new tab and fires only 'auxclick'.
    listen('auxclick', (event) => event.button === 1 && track(event)),
  ];

  return () => removers.forEach((remove) => remove());
}
