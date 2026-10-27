<p align="center">
  <a href="" rel="noopener">
  <img width=200px height=200px src="https://placehold.jp/000000/ffffff/200x200.png?text=analytics-context-layer&css=%7B%22border-radius%22%3A%22%20100px%22%7D" alt="analytics-context-layer logo"></a>
</p>

<h1 align="center">Analytics Context Layer</h1>

<div align="center">

[![GitHub Issues](https://img.shields.io/github/issues/drevops/analytics-context-layer.svg)](https://github.com/drevops/analytics-context-layer/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/drevops/analytics-context-layer.svg)](https://github.com/drevops/analytics-context-layer/pulls)
[![Test Node.js](https://github.com/drevops/analytics-context-layer/actions/workflows/test-nodejs.yml/badge.svg)](https://github.com/drevops/analytics-context-layer/actions/workflows/test-nodejs.yml)
[![codecov](https://codecov.io/gh/drevops/analytics-context-layer/graph/badge.svg)](https://codecov.io/gh/drevops/analytics-context-layer)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/drevops/analytics-context-layer)
![LICENSE](https://img.shields.io/github/license/drevops/analytics-context-layer)
![Renovate](https://img.shields.io/badge/renovate-enabled-green?logo=renovatebot)

</div>

---

Analytics Context Layer is a browser script that pushes a description of every click and change on your page's interactive elements to the analytics data layer. You mark up your components with `data-*` attributes. The script works out the element name, click type, visible text, link URL and group title, and pushes them to `window.dataLayer`.

## Features

- Binds links, buttons, submit and reset inputs and selects inside every element marked with `data-component`.
- Takes the group title from the nearest preceding heading or `data-group-title` element.
- Overrides the event name, element name and click type per component or per element.
- Calls your collector functions to add page-specific data before each push.
- Delays binding for components whose markup another script creates.
- Logs every pushed object to the console in debug mode.
- Ships as 1 file with no dependencies.

## Installation

Download `acl.js` or `acl.min.js` from the [latest release](https://github.com/drevops/analytics-context-layer/releases/latest) and add it to your pages:

```html
<script src="/path/to/acl.min.js"></script>
```

The script binds to the page when the DOM is ready.

## Usage

A component is the container of 1 or more interactive elements. To track a link in a promo card, mark the card with `data-component`:

```html
<div data-component="promo-card">
  <h3>Spring sale</h3>
  <a href="/sale">See the deals</a>
</div>
```

A click on the link pushes this object to `window.dataLayer`:

```js
{
  event: 'click_secondary_interaction',
  element_name: 'promo-card-link',
  click_type: 'link',
  click_text: 'See the deals',
  link_url: '/sale',
  component_name: 'promo card',
  group_title: 'Spring sale',
}
```

### Settings

To change the defaults, define `window.analyticsContextLayerSettings` before the script loads:

```html
<script>
  window.analyticsContextLayerSettings = {
    properties: { site_type: 'marketing' },
  };
</script>
<script src="/path/to/acl.min.js"></script>
```

The following table lists every setting:

| Setting              | Default                                                                    | Description                                                                  |
|----------------------|----------------------------------------------------------------------------|------------------------------------------------------------------------------|
| `elementTypes`       | `['a', 'button', 'input[type="submit"]', 'input[type="reset"]', 'select']` | Selectors of the elements bound within a component.                          |
| `buttonSelector`     | `'.button'`                                                                | Links matching this selector are reported with the `button` click type.      |
| `iconButtonSelector` | `'.icon-button'`                                                           | Elements matching this selector get the `-icon` element name suffix and an `icon` click text suffix. |
| `defaultEvent`       | `'click_secondary_interaction'`                                            | Event name used when no `data-event` applies.                                |
| `properties`         | `{}`                                                                       | Static properties added to every pushed object.                              |
| `dataLayerName`      | `'dataLayer'`                                                              | Name of the data layer array on `window`.                                    |
| `debugHash`          | `'#analytics-debug'`                                                       | URL hash that turns on debug mode.                                           |
| `debugStorageKey`    | `'analytics-debug'`                                                        | `localStorage` key that keeps debug mode on across pages.                    |
| `autoAttach`         | `true`                                                                     | If true, binds the whole document when the DOM is ready.                     |

The script exposes the class as `window.AnalyticsContextLayer` and the shared instance as `window.analyticsContextLayer`. To bind markup added after page load, call `window.analyticsContextLayer.attach(element)`. `attach()` skips components it has already bound.

### Attributes

The following table lists every attribute the script reads:

| Attribute                       | Set on                  | Description                                                                         |
|---------------------------------|-------------------------|-------------------------------------------------------------------------------------|
| `data-component`                | Component               | Component name. The script binds the elements inside the component.                 |
| `data-event`                    | Element or component    | Event name. On a component, the script binds the component itself as the element.   |
| `data-element-name`             | Element                 | Element name.                                                                       |
| `data-click-type`               | Element                 | Click type.                                                                         |
| `data-descendants-event`        | Ancestor of the element | Default `data-event` for every element inside it.                                   |
| `data-descendants-element-name` | Ancestor of the element | Default `data-element-name` for every element inside it.                            |
| `data-descendants-click-type`   | Ancestor of the element | Default `data-click-type` for every element inside it.                              |
| `data-group`                    | Group                   | Boundary of the group title lookup.                                                 |
| `data-group-title`              | Group title             | Marks the group title. Without it, the lookup matches `h2`, `h3` and `h4`.          |
| `data-subgroup`                 | Subgroup                | Boundary of the subgroup title lookup.                                              |
| `data-subgroup-title`           | Subgroup title          | Marks the subgroup title, pushed as `subgroup_title`.                               |
| `data-lookup-selector`          | Component               | Selector of an outer container that bounds the group title lookup.                  |
| `data-delayed-init`             | Component               | Delays binding until the component's `data-once` attribute contains this value.     |
| `data-collector`                | Component               | Dot-separated path to a function on `window`, called before each push.             |
| `data-skip`                     | Any element             | Excludes the element from group title lookups.                                      |

The group title lookup checks the preceding siblings of the element, then the preceding siblings of each ancestor. It stops at the component, at the `data-lookup-selector` container or at a `data-group` ancestor.

### Collectors

A collector is a function that adds page-specific data to the object before the push. It receives the object, the element, the component and the script instance, and changes the object in place:

```html
<div data-component="search-results" data-collector="siteAnalytics.searchResults">...</div>

<script>
  window.siteAnalytics = {
    searchResults(obj, element, component, acl) {
      obj.search_term = acl.getFieldText('#search-keywords') || 'none';
    },
  };
</script>
```

If the path doesn't resolve to a function, the script logs an error and pushes the object unchanged.

### Debugging

To log every pushed object to the console, append `#analytics-debug` to the URL. Debug mode stays on through `localStorage` until you remove the `analytics-debug` key. Turn on **Preserve log** in the browser console to keep the output across navigations.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local development setup and the build, linting and testing commands.

## Updating

To pull the latest infrastructure from the template into this project, ask Claude Code to "update scaffold" - see [`AGENTS.md`](AGENTS.md) for details.

---
_This repository was created using the [Scaffold](https://getscaffold.dev/) project template_
