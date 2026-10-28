/**
 * @file
 * Click events for interactive elements inside 'data-analytics-event'.
 */

import { getLabel, isSkipped, listen, resolveUrl } from '../dom.js';

/**
 * Find the title closest before an element within a scope.
 *
 * A match counts when it precedes the element in document order and is not
 * one of its ancestors, so the lookup covers the element's preceding siblings
 * and its ancestors' preceding siblings up to the scope.
 *
 * @param {Element} element  - The element.
 * @param {Element} scope    - The element that bounds the lookup.
 * @param {string}  selector - The CSS selector of the titles.
 * @return {Element|undefined} The last matching title, if any.
 */
function findTitle(element, scope, selector) {
  return [...scope.querySelectorAll(selector)]
    .filter((title) => title.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING && !title.contains(element) && !isSkipped(title))
    .pop();
}

/**
 * Get the title of the closest group or subgroup around an element.
 *
 * @param {Element}  element   - The element.
 * @param {string}   kind      - 'group' or 'subgroup'.
 * @param {string[]} selectors - The CSS selectors of the titles, in order of
 *   priority.
 * @return {string|undefined} The title, an empty string when none matches, or
 *   undefined outside any group of the kind.
 */
function getGroupTitle(element, kind, selectors) {
  const group = element.closest(`[data-analytics-${kind}]`);

  if (!group) {
    return undefined;
  }

  const scopeSelector = group.getAttribute(`data-analytics-${kind}-scope`);
  const scope = (scopeSelector && group.closest(scopeSelector)) || group;

  for (const selector of selectors) {
    const title = findTitle(element, scope, selector);

    if (title) {
      return getLabel(title);
    }
  }

  return '';
}

/**
 * Get the address a submit button sends its form to.
 *
 * @param {Element} element - The element.
 * @return {string|undefined} The absolute address, if the element is a submit
 *   button with a 'formaction' or a form with an 'action'.
 */
function getSubmitDestination(element) {
  if (element.type !== 'submit' || !element.form) {
    return undefined;
  }

  if (element.hasAttribute('formaction')) {
    return resolveUrl(element, 'formaction');
  }

  return element.form.hasAttribute('action') ? resolveUrl(element.form, 'action') : undefined;
}

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

    const isLink = element instanceof HTMLAnchorElement;
    const params = { link_text: getLabel(element), click_type: isLink ? 'link' : 'button' };
    const linkUrl = isLink ? element.href : getSubmitDestination(element);

    if (linkUrl !== undefined) {
      params.link_url = linkUrl;
    }

    const groupTitle = getGroupTitle(element, 'group', ['[data-analytics-group-title]', acl.settings.groupTitleSelector]);

    if (groupTitle !== undefined) {
      params.group_title = groupTitle;
    }

    const subgroupTitle = getGroupTitle(element, 'subgroup', ['[data-analytics-subgroup-title]']);

    if (subgroupTitle !== undefined) {
      params.subgroup_title = subgroupTitle;
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
