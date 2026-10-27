/**
 * @file
 * The 'form_submit' event for server-rendered confirmation markers.
 */

import { isSkipped } from '../dom.js';

const MARKER = '[data-analytics-form-submitted]';

/**
 * Track confirmation markers present at start and added later.
 *
 * @param {import('../core.js').AnalyticsContextLayer} acl - The instance.
 * @return {Function} A function that stops tracking.
 */
export function formSubmit(acl) {
  const seen = new WeakSet();

  const report = (marker) => {
    if (seen.has(marker) || isSkipped(marker)) {
      return;
    }

    seen.add(marker);
    acl.track('form_submit', marker, { form_name: marker.getAttribute('data-analytics-form-submitted') });
  };

  const scan = (root) => {
    if (root.matches?.(MARKER)) {
      report(root);
    }

    root.querySelectorAll(MARKER).forEach(report);
  };

  // AJAX forms render the confirmation after the page has loaded.
  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => node instanceof Element && scan(node)));
  });

  observer.observe(document, { childList: true, subtree: true });
  scan(document);

  return () => observer.disconnect();
}
