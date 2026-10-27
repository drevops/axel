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

Analytics Context Layer turns clicks and form interactions into analytics events. Your server renders `data-analytics-*` attributes into the page, and the script reads them when a visitor interacts. An adapter sends each event to its destination: Google Tag Manager, the Google tag or a system you plug in.

The script holds no rules about your markup. The attributes decide which elements report, under which event name and with which parameters. This README is for developers adding the script to a site and rendering its attributes.

## Features

- Tracks clicks on links and buttons inside elements marked with `data-analytics-event`.
- Tracks form starts, field changes and server-confirmed submissions as opt-in event types.
- Gathers parameters from the clicked element and its ancestors, the closest of each name winning.
- Sends events to Google Tag Manager, the Google tag or an adapter you supply.
- Never reads what a visitor types or chooses in a form field.
- Ships as 1 dependency-free file per setup, for a plain page or a Drupal site.

## Installation

Every [release](https://github.com/drevops/analytics-context-layer/releases/latest) attaches 1 ready-made bundle per setup. Pick the bundle that matches how your site starts scripts and where your events go:

| Bundle                  | Starts                                   | Sends events to                                  |
|-------------------------|------------------------------------------|--------------------------------------------------|
| `acl.gtm.js`            | When it loads                            | Google Tag Manager, through `window.dataLayer`   |
| `acl.gtag.js`           | When it loads                            | The Google tag, through `gtag()`                 |
| `acl.js`                | When it loads                            | The adapter in `window.analyticsContextLayerAdapter` |
| `acl.drupal.gtm.js`     | In a Drupal behavior                     | Google Tag Manager, through `window.dataLayer`   |
| `acl.drupal.gtag.js`    | In a Drupal behavior                     | The Google tag, through `gtag()`                 |
| `acl.drupal.js`         | In a Drupal behavior                     | The adapter in `window.analyticsContextLayerAdapter` |
| `acl.esm.js`            | When your code calls `init()`            | The adapter you pass to `init()`                 |

Each bundle also comes minified, such as `acl.gtm.min.js`. A bundle holds only its own adapter, so `acl.gtm.min.js` carries no Google tag code.

### Plain page

Add the bundle to your pages:

```html
<script src="/path/to/acl.gtm.min.js"></script>
```

The script starts tracking as soon as it loads. Its listeners sit on `document`, so it can load in `<head>` before the rest of the page. To change the defaults, see [Settings](#settings).

### Drupal

Define a library that loads a Drupal bundle:

```yaml
analytics:
  js:
    js/acl.drupal.gtm.min.js: { minified: true }
  dependencies:
    - core/drupal
    - core/drupalSettings
```

The bundle registers the `analyticsContextLayer` behavior. The behavior starts tracking when it first attaches and reads its settings from `drupalSettings.analyticsContextLayer`. Later attaches, such as after an AJAX request, change nothing.

### ES module

To bundle the script with your own code, import `init()` and an adapter from `acl.esm.js`:

```js
import { init, gtm } from './acl.esm.js';

init({ adapter: gtm, types: ['click', 'form_start'] });
```

The module's `init()` creates 1 shared instance on its first call. Later calls return that instance and ignore their settings, so a second call never doubles your events.

## Usage

To report the clicks inside a component, set `data-analytics-event` on the component:

```html
<section data-analytics-event="component_click" data-analytics-param-component="promo">
  <a href="/sale">See the deals</a>
</section>
```

With `acl.gtm.js`, a click on the link pushes this object to `window.dataLayer`:

```js
{
  event: 'component_click',
  link_text: 'See the deals',
  link_url: 'https://example.com/sale',
  component: 'promo',
}
```

### Attributes

The attributes are the public contract of the library and follow semantic versioning: renaming or removing an attribute is a breaking change.

The following table lists every attribute the script reads:

| Attribute                                | Set on                       | Description                                                                                         |
|------------------------------------------|------------------------------|-----------------------------------------------------------------------------------------------------|
| `data-analytics-event="<name>"`          | Component or element         | Names the click event for every link and button inside it. The one closest to the clicked element wins. |
| `data-analytics-param-<name>="<value>"`  | Any element                  | Adds a parameter to every event from the element and its descendants. Hyphens in `<name>` become underscores. |
| `data-analytics-skip`                    | Any element                  | Excludes the element and its descendants from every event type.                                     |
| `data-analytics-form="<name>"`           | Form, or an element around it | Marks a form for `form_start` and `field_complete`, with `<name>` as `form_name`.                   |
| `data-analytics-form-submitted="<name>"` | Confirmation message         | Sends `form_submit` for the form named `<name>` when the element is on the page.                    |

Parameters gather from the element that received the interaction up through its ancestors. When 2 elements set the same parameter, the closer one wins. A container can set `data-analytics-param-component="section"` and a card inside it can override it with `data-analytics-param-component="card"`.

### Event types

Each event type is a module you turn on with the `types` setting. Only `click` is on by default.

The following table lists every event type and the parameters the script derives for it:

| Type             | Sent when                                                                          | Event name                    | Derived parameters                                           |
|------------------|------------------------------------------------------------------------------------|-------------------------------|--------------------------------------------------------------|
| `click`          | A link or button inside `data-analytics-event` gets a click or a middle click      | The `data-analytics-event` value | `link_text`, plus `link_url` for links                     |
| `form_start`     | Focus first enters a marked form, once per form per page                           | `form_start`                  | `form_name`, plus `form_id` and `form_destination` when known |
| `field_complete` | A field inside a marked form fires `change`, every time it does                    | `field_complete`              | The `form_start` parameters, `field_name` when the field has a `name`, and `field_label` |
| `form_submit`    | A `data-analytics-form-submitted` element is on the page or is added to it later   | `form_submit`                 | `form_name`                                                  |

A `data-analytics-param-*` attribute overrides a derived parameter of the same name. For example, `data-analytics-param-link-text="Custom text"` replaces the text of the link.

The script derives each parameter as follows:

- `link_text` is the visible text of the link or button with whitespace collapsed. It skips `aria-hidden="true"` content and falls back to `aria-label`, then `title`. For an input button, it's the button's `value`.
- `link_url` is the absolute address of the link.
- `form_id` is the `id` of the marked element. `form_destination` is the absolute `action` address, when the marked element is a `<form>` with an `action` attribute.
- `field_label` is the text of the field's `<label>`, or its `aria-label`. For a radio button or checkbox inside a `<fieldset>`, it's the fieldset's `<legend>`, because the option's own label is the visitor's answer. A radio button outside a fieldset reports only its `aria-label`.

Only the server knows that a submission succeeded, so `form_submit` waits for a confirmation it renders. Render `data-analytics-form-submitted` into the confirmation message:

```html
<div data-analytics-form-submitted="contact">Thank you for your enquiry.</div>
```

The script also detects the attribute when it arrives after the page loads, such as in an AJAX confirmation. To report a submission from your own code, call `formSubmitted()`:

```js
window.analyticsContextLayer.formSubmitted('contact', { form_step: '2' });
```

`formSubmitted()` sends the event whether or not `form_submit` is in `types`. The `form_submit` type only controls the attribute detection.

### Privacy

Field events never carry what a visitor typed or chose: `field_complete` reports the field's name and label only. The script reads no text from inside a `<select>` or `<textarea>`, even when one sits inside a label or a link. Google Analytics forbids personal information in events, and form fields often hold it.

Parameters you render yourself are sent as they are. Keep personal information out of `data-analytics-param-*` values and out of your own adapters.

### Adapters

An adapter sends each event to its destination. The library ships 2 adapters for Google products, and both read `window.dataLayer`:

| Adapter | Sends each event as                                                                      | Use it when                         |
|---------|------------------------------------------------------------------------------------------|-------------------------------------|
| `gtm`   | `window.dataLayer.push({ event: name, ...params })`                                      | Google Tag Manager routes your events |
| `gtag`  | `gtag('event', name, params)`, queued in `window.dataLayer` until the Google tag loads   | The page loads the Google tag directly |

Google Tag Manager reads plain objects from `window.dataLayer`. The Google tag reads only what its own `gtag()` function queues there, so pick the adapter that matches the script your page loads.

To send events to another system, such as Segment or `adobeDataLayer`, load `acl.js` or `acl.drupal.js` and define your adapter in `window.analyticsContextLayerAdapter` before the bundle starts:

```html
<script>
  window.analyticsContextLayerAdapter = (name, params) => window.analytics.track(name, params);
</script>
<script src="/path/to/acl.min.js"></script>
```

An adapter is a function that receives the event name and parameters, or an object with these methods:

- `send(name, params, context)` delivers the event. `context.debug` is true in debug mode, and `context.settings` holds the instance settings.
- `validate(name, params)` is optional. It returns an array of warning messages, which debug mode prints to the console.

On Drupal, define `window.analyticsContextLayerAdapter` in a library that loads on the same pages as `acl.drupal.js`. Drupal attaches behaviors after every library has loaded, so the order of the 2 libraries makes no difference.

### Settings

To change the defaults on a plain page, define `window.analyticsContextLayerSettings` before the bundle loads:

```html
<script>
  window.analyticsContextLayerSettings = {
    types: ['click', 'form_start', 'field_complete', 'form_submit'],
    properties: { site: 'marketing' },
  };
</script>
<script src="/path/to/acl.gtm.min.js"></script>
```

On Drupal, put the same keys in `drupalSettings.analyticsContextLayer`. With `acl.esm.js`, pass them to `init()`.

The following table lists every setting:

| Setting           | Default                                                          | Description                                                                         |
|-------------------|------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `types`           | `['click']`                                                      | Event types to track: `click`, `form_start`, `field_complete` and `form_submit`. The list replaces the default, so include `click` to keep tracking clicks. |
| `adapter`         | None                                                             | The adapter, for `init()` in `acl.esm.js`. The bundles set it themselves and ignore this setting. |
| `properties`      | `{}`                                                             | Static parameters added to every event. Every other parameter overrides them.       |
| `clickSelector`   | `'a[href], button, input[type="submit"], input[type="button"]'` | Elements whose clicks the `click` type tracks.                                      |
| `debugHash`       | `'#analytics-debug'`                                             | URL hash that turns on debug mode.                                                  |
| `debugStorageKey` | `'analyticsDebug'`                                               | `sessionStorage` key that keeps debug mode on until the tab closes.                 |
| `autoInit`        | `true`                                                           | If true, a plain-page bundle starts tracking when it loads. If false, call `window.analyticsContextLayer.init()` yourself. Drupal bundles always start in the behavior. |
| `dataLayerName`   | `'dataLayer'`                                                    | Name of the data layer array on `window`. Only the `gtm` and `gtag` adapters read it. |

A missing adapter or an unknown event type throws an error when the instance is created, so a typo fails before any event is lost.

Every bundle exposes the class as `window.AnalyticsContextLayer` and the shared instance as `window.analyticsContextLayer`. Call `destroy()` on an instance to stop tracking, and `init()` to start again with the same settings.

### Google Analytics limits

Google Analytics 4 applies these limits to every event:

- An event name has at most 40 characters.
- An event has at most 25 parameters.
- A parameter value has at most 100 characters.
- A standard property has at most 50 event-scoped custom dimensions, and each parameter you report on needs its own dimension.

In debug mode, the `gtm` and `gtag` adapters warn in the console when an event breaks 1 of the first 3 limits.

### Debugging

To log every event to the console, append `#analytics-debug` to the URL. Debug mode stays on in that tab and in tabs opened from it until the tab closes, so it holds on the pages your clicks open. Turn on **Preserve log** in the browser console to keep the output across navigations.

In debug mode, the `gtm` and `gtag` adapters add `debug_mode: true` to every event, so Google Analytics lists it in DebugView.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local development setup and the build, linting and testing commands.

## Updating

To pull the latest infrastructure from the template into this project, ask Claude Code to "update scaffold" - see [`AGENTS.md`](AGENTS.md) for details.

---
_This repository was created using the [Scaffold](https://getscaffold.dev/) project template_
