/**
 * @file
 * Analytics Context Layer.
 *
 * Binds to interactive elements inside components marked with
 * 'data-component', extracts contextual data about the element on interaction
 * and pushes it to the data layer.
 *
 * An "element" is an interactive element: a link, a button, a form submit or a
 * select. A "component" is the container of the element, or the element itself
 * for single-element components.
 *
 * Append '#analytics-debug' to the URL to log every pushed object to the
 * console. Enable "Preserve log" in the browser console to keep the output
 * across navigations and form submissions.
 *
 * Attributes:
 *
 * - data-component: Component name. Only the component and its descendants
 *   are bound. Set on the component.
 * - data-event: Event name. Set on the element. When set on the component, the
 *   component itself is bound as the element.
 * - data-element-name: Element name. Set on the element.
 * - data-click-type: Click type. Set on the element.
 * - data-descendants-event, data-descendants-element-name,
 *   data-descendants-click-type: Defaults for 'data-event', 'data-element-name'
 *   and 'data-click-type' of all descendants. Set on the component or on any
 *   ancestor of the element within it.
 * - data-group: Boundary of the group title lookup. Set on an ancestor of the
 *   element within the component.
 * - data-group-title: Marks the group title. Headings are used when no element
 *   carries this attribute.
 * - data-subgroup, data-subgroup-title: Same as 'data-group' and
 *   'data-group-title' for a nested group.
 * - data-lookup-selector: Selector of a container outside the component used
 *   as the boundary of the group title lookup. Set on the component.
 * - data-delayed-init: Defers binding until the component's 'data-once'
 *   attribute contains this value. Set on the component.
 * - data-collector: Dot-separated path to a function on 'window' that receives
 *   the object before it is pushed. Set on the component.
 * - data-skip: Excludes the element from group title lookups.
 */

export const DEFAULT_SETTINGS = {
  // Selectors of the elements bound within a component.
  elementTypes: ['a', 'button', 'input[type="submit"]', 'input[type="reset"]', 'select'],
  // Links matching this selector are reported as buttons.
  buttonSelector: '.button',
  iconButtonSelector: '.icon-button',
  defaultEvent: 'click_secondary_interaction',
  // Static properties added to every pushed object.
  properties: {},
  dataLayerName: 'dataLayer',
  debugHash: '#analytics-debug',
  debugStorageKey: 'analytics-debug',
  autoAttach: true,
};

export class AnalyticsContextLayer {
  /**
   * @param {object} settings - Overrides for DEFAULT_SETTINGS.
   */
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.isDebug = false;
    this.attached = new WeakSet();
  }

  /**
   * Bind all components found within the context.
   *
   * Components that are already bound are skipped, so the method is safe to
   * call repeatedly on the same or overlapping contexts.
   *
   * @param {Document|Element} context - The root to search for components.
   */
  attach(context = document) {
    const { dataLayerName, debugHash, debugStorageKey } = this.settings;

    window[dataLayerName] = window[dataLayerName] || [];

    this.isDebug = window.location.hash === debugHash || window.localStorage.getItem(debugStorageKey) === '1';

    if (this.isDebug && !window.localStorage.getItem(debugStorageKey)) {
      console.log('[analytics] Debug enabled');
      window.localStorage.setItem(debugStorageKey, '1');
    }

    context.querySelectorAll('[data-component]').forEach((component) => {
      if (this.attached.has(component)) {
        return;
      }

      this.attached.add(component);

      if (component.hasAttribute('data-delayed-init')) {
        this.observeDelayedInit(component);

        return;
      }

      this.bind(component);
    });
  }

  /**
   * Bind the component once its 'data-once' attribute contains the value of
   * its 'data-delayed-init' attribute.
   *
   * @param {Element} component - The component.
   */
  observeDelayedInit(component) {
    const expected = component.getAttribute('data-delayed-init');

    const observer = new MutationObserver(() => {
      const values = (component.getAttribute('data-once') || '').split(' ');

      if (!values.includes(expected)) {
        return;
      }

      observer.disconnect();
      this.bind(component);
    });

    observer.observe(component, { attributes: true, attributeFilter: ['data-once'] });
  }

  /**
   * Add event listeners to the elements of the component.
   *
   * @param {Element} component - The component.
   */
  bind(component) {
    const elements = component.getAttribute('data-event') ? [component] : this.settings.elementTypes.flatMap((type) => [...component.querySelectorAll(type)]);

    // Elements of a nested component are bound by that component.
    elements
      .filter((element) => element.closest('[data-component]') === component)
      .forEach((element) => {
        const type = element.tagName.toLowerCase() === 'select' ? 'change' : 'click';

        element.addEventListener(type, () => this.push(this.collect(element)));
      });
  }

  /**
   * Build the data layer object for the element.
   *
   * @param {Element} element - The element that received the interaction.
   * @return {object} The data layer object.
   */
  collect(element) {
    const { buttonSelector, iconButtonSelector, defaultEvent, properties } = this.settings;

    const component = element.closest('[data-component]');
    const componentName = component.getAttribute('data-component');
    const lookupSelector = component.getAttribute('data-lookup-selector');
    const lookupContainer = lookupSelector ? document.querySelector(lookupSelector) : component;
    const tagName = element.tagName.toLowerCase();
    const isIconButton = element.matches(iconButtonSelector);

    const obj = {
      event: defaultEvent,
      element_name: `${componentName}-link`,
      click_type: tagName === 'a' && !element.matches(buttonSelector) ? 'link' : 'button',
      click_text: '',
      link_url: '',
      component_name: componentName.replace(/-/g, ' '),
      group_title: '',
      ...properties,
    };

    if (isIconButton) {
      obj.element_name = `${componentName}-icon`;
    } else if (obj.click_type === 'button') {
      obj.element_name = `${componentName}-cta`;
    }

    obj.event = element.getAttribute('data-event') || this.getAttributeFromParent('data-descendants-event', element) || obj.event;
    obj.element_name = element.getAttribute('data-element-name') || this.getAttributeFromParent('data-descendants-element-name', element) || obj.element_name;
    obj.click_type = element.getAttribute('data-click-type') || this.getAttributeFromParent('data-descendants-click-type', element) || obj.click_type;

    obj.click_text = this.getText(element);

    if (isIconButton) {
      obj.click_text += ' icon';
    }

    // A button can be implemented with an '<a>' tag, so the URL source is
    // chosen by the tag rather than by the click type.
    obj.link_url = tagName === 'a' ? element.getAttribute('href') || '' : element.closest('form')?.getAttribute('action') || '';

    obj.group_title = this.findGroupTitle(element, lookupContainer);

    const subgroupTitle = this.findGroupTitle(element, lookupContainer, '[data-subgroup-title]', 'data-subgroup');

    if (subgroupTitle) {
      obj.subgroup_title = subgroupTitle;
    }

    const collector = component.getAttribute('data-collector');

    if (collector) {
      try {
        this.exec(collector, window, obj, element, component, this);
      } catch (error) {
        console.error(error.message);
      }
    }

    return obj;
  }

  /**
   * Push the object to the data layer.
   *
   * @param {object} obj - The data layer object.
   */
  push(obj) {
    if (this.isDebug) {
      console.log('[analytics] Data pushed to dataLayer', JSON.stringify(obj, null, 2));
    }

    window[this.settings.dataLayerName].push(obj);
  }

  /**
   * Extract the visible text of an element.
   *
   * @param {Element} element - The element to extract text from.
   * @return {string} The extracted text.
   */
  getText(element) {
    const getTextFromNode = (node) => {
      if (node.nodeType === Node.COMMENT_NODE) {
        return '';
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.getAttribute('aria-hidden') === 'true' ? '' : [...node.childNodes].map(getTextFromNode).join('');
      }

      return node.textContent.replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
    };

    if (element.tagName.toLowerCase() === 'select') {
      return element.options[element.selectedIndex].text;
    }

    // Inputs are described by their label, falling back to their value.
    if (element.value) {
      const label = element.id ? document.querySelector(`label[for="${element.id}"]`)?.textContent.trim() : null;

      return label || element.value.trim();
    }

    return getTextFromNode(element).trim();
  }

  /**
   * Find the title of the group that contains the element.
   *
   * Searches the preceding siblings of the element, then the preceding
   * siblings of each ancestor, stopping at the container or at an ancestor
   * with the bounding attribute.
   *
   * @param {Element} element           - The element.
   * @param {Element} container         - The outermost element to search in.
   * @param {string}  selectors         - Selectors of the title element.
   * @param {string}  boundingAttribute - Attribute of the group boundary.
   * @return {string} The group title.
   */
  findGroupTitle(element, container, selectors = '[data-group-title], h4, h3, h2', boundingAttribute = 'data-group') {
    if (element === container) {
      return '';
    }

    const findTitle = (candidate) => {
      if (this.isSkipped(candidate)) {
        return null;
      }

      return candidate.matches(selectors) ? candidate : candidate.querySelector(selectors);
    };

    const findTitleInPrecedingSiblings = (start) => {
      let sibling = start.previousElementSibling;
      let title = null;

      while (sibling && !title) {
        title = findTitle(sibling);
        sibling = sibling.previousElementSibling;
      }

      return title;
    };

    let title = findTitleInPrecedingSiblings(element);
    let parent = element.parentElement;

    while (!title && parent && parent !== container && !parent.hasAttribute(boundingAttribute)) {
      title = findTitleInPrecedingSiblings(parent);
      parent = parent.parentElement;
    }

    return title ? this.getText(title) : '';
  }

  /**
   * Get the value of the attribute from the element or its closest ancestor.
   *
   * @param {string}  name    - The attribute name.
   * @param {Element} element - The element to start from.
   * @return {string|null} The attribute value or null.
   */
  getAttributeFromParent(name, element) {
    let current = element;

    while (current) {
      const value = current.getAttribute(name);

      if (value) {
        return value;
      }

      current = current.parentElement;
    }

    return null;
  }

  /**
   * Call a function by its dot-separated path.
   *
   * @param {string}     path    - The path to the function, e.g. 'a.b.fn'.
   * @param {object}     context - The object the path is resolved against.
   * @param {...unknown} args    - The arguments to pass to the function.
   * @return {unknown} The result of the function call.
   */
  exec(path, context = window, ...args) {
    const parts = path.split('.');
    const name = parts.pop();
    const owner = parts.reduce((current, part) => current?.[part], context);

    if (owner?.[name] instanceof Function) {
      return owner[name](...args);
    }

    throw new Error(`Function ${path} not found or not callable.`);
  }

  /**
   * Get the comma-separated text of the fields matching the selector.
   *
   * Checkboxes and radios contribute only when checked.
   *
   * @param {string} selector - The selector of the fields.
   * @return {string|null} The fields text or null when nothing matched.
   */
  getFieldText(selector) {
    const values = [...document.querySelectorAll(selector)]
      .filter((field) => !['checkbox', 'radio'].includes(field.type) || field.checked)
      .map((field) => this.getText(field));

    return values.length > 0 ? values.join(', ') : null;
  }

  /**
   * Check if the element is excluded from lookups.
   *
   * @param {Element} element - The element to check.
   * @return {boolean} TRUE if the element is skipped.
   */
  isSkipped(element) {
    return element.hasAttribute('data-skip');
  }
}
