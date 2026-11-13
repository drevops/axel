<p align="center">
  <a href="" rel="noopener">
  <img width="320" src="logo.svg" alt="Axel logo"></a>
</p>

<h1 align="center">Axel</h1>
<h3 align="center">Analytics Context Layer</h3>

<div align="center">

[![GitHub Issues](https://img.shields.io/github/issues/drevops/axel.svg)](https://github.com/drevops/axel/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/drevops/axel.svg)](https://github.com/drevops/axel/pulls)
[![Test Node.js](https://github.com/drevops/axel/actions/workflows/test-nodejs.yml/badge.svg)](https://github.com/drevops/axel/actions/workflows/test-nodejs.yml)
[![codecov](https://codecov.io/gh/drevops/axel/graph/badge.svg)](https://codecov.io/gh/drevops/axel)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/drevops/axel)
![LICENSE](https://img.shields.io/github/license/drevops/axel)
![Renovate](https://img.shields.io/badge/renovate-enabled-green?logo=renovatebot)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/drevops/axel/badge)](https://scorecard.dev/viewer/?uri=github.com/drevops/axel)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/16649/badge)](https://www.bestpractices.dev/projects/16649)
[![npm](https://img.shields.io/npm/v/@drevops/axel)](https://www.npmjs.com/package/@drevops/axel)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/@drevops/axel/badge)](https://www.jsdelivr.com/package/npm/@drevops/axel)

</div>

---

Axel turns clicks and form interactions into analytics events. Your server renders `data-axel-*` attributes into the page, and the script reads them when a visitor interacts. An adapter sends each event to its destination: Google Tag Manager, the Google tag or a system you plug in.

The script holds no rules about your markup. The attributes decide which elements report, under which event name and with which parameters. This README is for developers adding the script to a site and rendering its attributes.

## ✨ Features

- Tracks clicks on links and buttons inside elements marked with `data-axel-event`.
- Tracks form starts, field changes and server-confirmed submissions as opt-in event types.
- Gathers parameters from the clicked element and its ancestors, the closest of each name winning.
- Sends the title of the group a click sits in, from a marker or the closest heading before it.
- Runs your own collector functions to add parameters the markup can't hold.
- Sends events to Google Tag Manager, the Google tag or an adapter you supply.
- Never reads what a visitor types or chooses in a form field.
- Ships as 1 dependency-free file per setup, for a plain page or a Drupal site.

## 🤔 Why?

Google Analytics can tell you that a visitor clicked a link or submitted a form. To act on that, you need to know which link and which form, and the context around them: the card, the section and the component they sat in.

For example, a services page shows a grid of cards, and every card ends in a "Learn more" link. A report that lists clicks on "Learn more" can't tell you which card the visitor picked or which section of the page held it.

Without Axel, you get that context by tracking each link and form on its own. In Google Tag Manager, you write a trigger and context variables for every component. In code, a developer adds a `dataLayer.push()` call to every link and form in the templates. On a site with many page types and components, that's an enormous amount of work, and every new component adds more.

Axel replaces that per-link work with 1 attribute per component. Mark a component with `data-axel-event="card_click"`, and Axel sends a `card_click` event for every link and button inside it. Mark a form with `data-axel-form`, and Axel reports when a visitor starts it and changes a field, never what they typed. It reports the submission when the server's confirmation message appears on the page. Axel gathers the context for each event itself:

- The link text and URL, or the form name and field labels
- The section and card titles, read from the headings inside elements you mark with `data-axel-group` and `data-axel-subgroup`
- Every `data-axel-param-*` value set on the element or any element that contains it

Axel tracks a new page built from tracked components with no new tracking work.

The attributes also give your analytics team a tracking framework. The team defines how every event is tracked and reported on: the event names, the parameters and which components send them. Developers add those attributes to the component templates, and Axel reports every page built from them the same way.

<details>
<summary><strong>🔍 Already on Google Analytics or Tag Manager? See what Axel adds, side by side</strong></summary>

### Don't existing analytics tools do this already?

Nothing gathers this context for Google Analytics out of the box. These tools differ in where the context comes from:

| Tool                                                                 | Where the context comes from                                                                                           |
|----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| Google Analytics 4 Enhanced Measurement                              | The clicked link's own URL, classes and ID. It sends no `click` event for links to your own domain.                   |
| Google Tag Manager                                                   | Selectors and Custom JavaScript variables you write in the container for each component, tied to the theme's CSS classes. |
| Autocapture in Heap and PostHog                                      | The element's text and position in the page, stored for every click. You define events afterward with CSS selectors, and a selector stops matching when the markup changes. |
| PostHog `data-ph-capture-attribute-*`, Matomo content tracking and the Adobe Experience Manager data layer | Attributes you add to your templates, each format built for its own product.                         |

Axel reads attributes you add to your templates, like the tools in the last row. It sends the events to Google Tag Manager, the Google tag or an adapter you write.

You can also render your own attributes and read them in Google Tag Manager. Its Element Attribute variable reads only the clicked element. Context on the card or section around it needs a Custom JavaScript variable or a community template for each parameter. Axel does that lookup for every parameter on every event.

### Compared with Google's tracking

For example, take a services grid where both links read "Learn more". Each of the 3 approaches in this section tracks this grid:

```html
<section class="services">
  <h2>Our services</h2>
  <div class="card">
    <h3>Repairs</h3>
    <a class="card-link" href="/services/repairs">Learn more</a>
  </div>
  <div class="card">
    <h3>Installations</h3>
    <a class="card-link" href="/services/installations">Learn more</a>
  </div>
</section>
```

To tell the 2 links apart in a report, you need the card title and the section heading.

#### Enhanced Measurement

Enhanced Measurement in Google Analytics 4 sends `click` only for links to another domain, so it reports neither link. For a link to another domain, it sends `link_url`, `link_domain`, `link_classes`, `link_id` and `outbound`.

Its `form_submit` goes out when the visitor submits a form, so a submission the server rejects still counts. Axel sends `form_submit` when the server's confirmation message, marked with `data-axel-form-submitted`, reaches the page.

#### Google Tag Manager

In Google Tag Manager, a click trigger matches the links by their `card-link` class. A Custom JavaScript variable reads the card title from the clicked element:

```js
function () {
  var card = {{Click Element}}.closest('.card');
  var title = card && card.querySelector('h3');

  return title ? title.textContent.trim() : undefined;
}
```

A second variable reads the section heading, and a GA4 event tag maps each variable to a parameter. Every component type needs its own trigger and variables.

After a redesign renames `.card`, the variable returns `undefined`. The container sits outside the site's code, so the site's tests never run the variable.

#### Axel

With Axel, the grid's template holds these attributes:

```html
<section data-axel-event="card_click" data-axel-param-component="services" data-axel-group>
  <h2 data-axel-group-title>Our services</h2>
  <div data-axel-subgroup>
    <h3 data-axel-subgroup-title>Repairs</h3>
    <a href="/services/repairs">Learn more</a>
  </div>
  <div data-axel-subgroup>
    <h3 data-axel-subgroup-title>Installations</h3>
    <a href="/services/installations">Learn more</a>
  </div>
</section>
```

`data-axel-event` names the event for every link in the section, and `data-axel-param-component` adds the `component` parameter. `data-axel-group` and `data-axel-subgroup` mark the section and each card, and their `-title` attributes mark the headings. [Attributes](#attributes) lists them all.

With `axel.gtm.js`, a click on the second link pushes this object to `window.dataLayer`:

```js
{
  event: 'card_click',
  link_text: 'Learn more',
  click_type: 'link',
  link_url: 'https://example.com/services/installations',
  group_title: 'Our services',
  subgroup_title: 'Installations',
  component: 'services',
}
```

With `axel.gtm.js`, Google Tag Manager still needs a custom event trigger and a GA4 event tag that maps each parameter. With `axel.gtag.js`, Axel sends events through the Google tag's `gtag()` function. Either way, each parameter you report on needs a dimension in Google Analytics, as [Google Analytics limits](#google-analytics-limits) describes.

Changing the parameters means editing the template and deploying the site. In Google Tag Manager, a change goes live when you publish the container.

#### Axel alongside Enhanced Measurement

Enhanced Measurement covers events Axel doesn't send, such as scrolls, site search and video engagement. Follow 2 rules when a page loads both:

- Turn off **Form interactions** in Enhanced Measurement when Axel tracks forms. Otherwise both send `form_start` and `form_submit` for a form marked with `data-axel-form`.
- Give Axel events a name other than `click`, such as `card_click`. Enhanced Measurement sends `click` for links to another domain, so a shared name mixes the 2 in reports.

</details>

## 📦 Installation

Axel ships 1 ready-made bundle per setup. Pick the bundle that matches how your site starts scripts and where your events go:

| Bundle                  | Starts                                   | Sends events to                                  |
|-------------------------|------------------------------------------|--------------------------------------------------|
| `axel.gtm.js`           | When it loads                            | Google Tag Manager, through `window.dataLayer`   |
| `axel.gtag.js`          | When it loads                            | The Google tag, through `gtag()`                 |
| `axel.js`               | When it loads                            | The adapter in `window.axelAdapter`              |
| `axel.drupal.gtm.js`    | In a Drupal behavior                     | Google Tag Manager, through `window.dataLayer`   |
| `axel.drupal.gtag.js`   | In a Drupal behavior                     | The Google tag, through `gtag()`                 |
| `axel.drupal.js`        | In a Drupal behavior                     | The adapter in `window.axelAdapter`              |
| `axel.esm.js`           | When your code calls `init()`            | The adapter you pass to `init()`                 |

Each bundle also comes minified, such as `axel.gtm.min.js`. A bundle holds only its own adapter, so `axel.gtm.min.js` carries no Google tag code.

### Where to get the bundles

Load the bundles from [jsDelivr](https://www.jsdelivr.com/package/npm/@drevops/axel), which serves every file of every release:

```text
https://cdn.jsdelivr.net/npm/@drevops/axel@VERSION/dist/FILE
```

The same files are in the `dist/` folder of the [`@drevops/axel`](https://www.npmjs.com/package/@drevops/axel) npm package, and in the assets of each [GitHub release](https://github.com/drevops/axel/releases/latest).

Pin an exact version such as `0.3.0`. A range such as `@0` or `@latest` serves a different file after the next release, so its Subresource Integrity hash stops matching and the browser blocks the script. The notes of each release list the jsDelivr URL and hash of every bundle, plus a ready-made `<script>` tag. [`SECURITY.md`](SECURITY.md#verify-a-bundle) explains how to verify a file you downloaded.

### Plain page

To load the bundle from jsDelivr, add it with its Subresource Integrity hash. The browser then refuses to run a file that differs from the release:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@drevops/axel@VERSION/dist/axel.gtm.min.js"
  integrity="sha384-HASH"
  crossorigin="anonymous"
></script>
```

Replace `VERSION` with a release version such as `0.3.0`. Replace `sha384-HASH` with the bundle's hash from that release's notes.

To serve the bundle from your own site, copy it from `node_modules/@drevops/axel/dist/` after `npm install @drevops/axel`, or from the GitHub release. Then add it to your pages:

```html
<script src="/path/to/axel.gtm.min.js"></script>
```

The script starts tracking as soon as it loads. Its listeners sit on `document`, so it can load in `<head>` before the rest of the page. To change the defaults, see [Settings](#settings).

### Drupal

To load the bundle from jsDelivr, define a library in your module or theme that points at the CDN, with the bundle's hash:

```yaml
axel:
  js:
    https://cdn.jsdelivr.net/npm/@drevops/axel@VERSION/dist/axel.drupal.gtm.min.js:
      type: external
      minified: true
      attributes:
        integrity: sha384-HASH
        crossorigin: anonymous
  dependencies:
    - core/drupal
    - core/drupalSettings
```

To serve the bundle from your own site instead, install it with Composer. [Asset Packagist](https://asset-packagist.org) offers npm packages as Composer packages, and `@drevops/axel` is `npm-asset/drevops--axel` there. To install it into `web/libraries`:

1. Add Asset Packagist as a repository and require the package:

    ```bash
    composer config repositories.asset-packagist composer https://asset-packagist.org
    composer require oomphinc/composer-installers-extender npm-asset/drevops--axel
    ```

2. In `composer.json`, add `npm-asset` to `extra.installer-types` and add `"type:npm-asset"` to the `web/libraries/{$name}` entry in `extra.installer-paths`. Then run `composer install`. The bundles land in `web/libraries/drevops--axel/dist/`.

3. Define a library in your module or theme that loads a Drupal bundle:

    ```yaml
    axel:
      js:
        /libraries/drevops--axel/dist/axel.drupal.gtm.min.js: { minified: true }
      dependencies:
        - core/drupal
        - core/drupalSettings
    ```

The bundle registers the `axel` behavior. The behavior starts tracking when it first attaches and reads its settings from `drupalSettings.axel`. Later attaches, such as after an AJAX request, change nothing.

### ES module

To bundle the script with your own code, install the package from npm:

```bash
npm install @drevops/axel
```

Import `init()` and an adapter from the package, which resolves to `axel.esm.js`:

```js
import { init, gtm } from '@drevops/axel';

init({ adapter: gtm, types: ['click', 'form_start'] });
```

The module's `init()` creates 1 shared instance on its first call. Later calls return that instance and ignore their settings, so a second call never doubles your events.

## 🚀 Usage

To report the clicks inside a component, set `data-axel-event` on the component:

```html
<section
  data-axel-event="component_click"
  data-axel-param-component="promo"
>
  <a href="/sale">See the deals</a>
</section>
```

With `axel.gtm.js`, a click on the link pushes this object to `window.dataLayer`:

```js
{
  event: 'component_click',
  link_text: 'See the deals',
  click_type: 'link',
  link_url: 'https://example.com/sale',
  component: 'promo',
}
```

### Attributes

The attributes are the public contract of the library and follow semantic versioning: renaming or removing an attribute is a breaking change.

The following table lists every attribute the script reads:

| Attribute                               | Set on                        | Description                                                                                         |
|-----------------------------------------|-------------------------------|-----------------------------------------------------------------------------------------------------|
| `data-axel-event="<name>"`              | Component or element          | Names the click event for every link and button inside it. The one closest to the clicked element wins. |
| `data-axel-param-<name>="<value>"`      | Any element                   | Adds a parameter to every event from the element and its descendants. Hyphens in `<name>` become underscores. |
| `data-axel-skip`                        | Any element                   | Excludes the element and its descendants from every event type.                                     |
| `data-axel-form="<name>"`               | Form, or an element around it | Marks a form for `form_start` and `field_complete`, with `<name>` as `form_name`.                   |
| `data-axel-form-submitted="<name>"`     | Confirmation message          | Sends `form_submit` for the form named `<name>` when the element is on the page.                    |
| `data-axel-group`                       | Any element                   | Adds `group_title` to every click inside it. See [Groups](#groups).                                 |
| `data-axel-group-title`                 | Any element inside a group    | Marks the element whose text is the group title.                                                    |
| `data-axel-group-scope="<selector>"`    | Group                         | Widens the group title lookup to the closest ancestor matching `<selector>`.                        |
| `data-axel-subgroup`                    | Any element                   | Adds `subgroup_title` to every click inside it.                                                     |
| `data-axel-subgroup-title`              | Any element inside a subgroup | Marks the element whose text is the subgroup title.                                                 |
| `data-axel-subgroup-scope="<selector>"` | Subgroup                      | Widens the subgroup title lookup to the closest ancestor matching `<selector>`.                     |
| `data-axel-collector="<name>"`          | Any element                   | Runs the collector named `<name>` for every event from the element and its descendants. See [Collectors](#collectors). |

Parameters gather from the element that received the interaction up through its ancestors. When 2 elements set the same parameter, the closer one wins. A container can set `data-axel-param-component="section"` and a card inside it can override it with `data-axel-param-component="card"`.

### Event types

Each event type is a module you turn on with the `types` setting. Only `click` is on by default.

The following table lists every event type and the parameters the script derives for it:

| Type             | Sent when                                                                          | Event name                    | Derived parameters                                           |
|------------------|------------------------------------------------------------------------------------|-------------------------------|--------------------------------------------------------------|
| `click`          | A link or button inside `data-axel-event` gets a click or a middle click           | The `data-axel-event` value   | `link_text` and `click_type`, `link_url` for links and submit buttons, and `group_title` and `subgroup_title` inside groups |
| `form_start`     | Focus first enters a marked form, once per form per page                           | `form_start`                  | `form_name`, plus `form_id` and `form_destination` when known |
| `field_complete` | A field inside a marked form fires `change`, every time it does                    | `field_complete`              | The `form_start` parameters, `field_name` when the field has a `name`, and `field_label` |
| `form_submit`    | A `data-axel-form-submitted` element is on the page or is added to it later        | `form_submit`                 | `form_name`                                                  |

A `data-axel-param-*` attribute overrides a derived parameter of the same name. For example, `data-axel-param-link-text="Custom text"` replaces the text of the link.

The script derives each parameter as follows:

- `link_text` is the visible text of the link or button with whitespace collapsed. It skips `aria-hidden="true"` content and falls back to `aria-label`, then `title`. For an input button, it's the button's `value`.
- `click_type` is `link` for a link and `button` for every other element.
- `link_url` is the absolute address of the link, without the parts [Privacy](#privacy) describes. For a submit button, it's the button's `formaction`, or the `action` of its form. A submit button with neither sends no `link_url`, and neither does an address that isn't a valid URL.
- `form_id` is the `id` of the marked element. `form_destination` is the absolute `action` address, when the marked element is a `<form>` with an `action` attribute that holds a valid URL.
- `field_label` is the text of the field's `<label>`, or its `aria-label`. For a radio button or checkbox inside a `<fieldset>`, it's the fieldset's `<legend>`, because the option's own label is the visitor's answer. A radio button outside a fieldset reports only its `aria-label`.

Only the server knows that a submission succeeded, so `form_submit` waits for a confirmation it renders. Render `data-axel-form-submitted` into the confirmation message:

```html
<div data-axel-form-submitted="contact">Thank you for your enquiry.</div>
```

The script also detects the attribute when it arrives after the page loads, such as in an AJAX confirmation. To report a submission from your own code, call `formSubmitted()`:

```js
window.axel.formSubmitted('contact', { form_step: '2' });
```

`formSubmitted()` sends the event whether or not `form_submit` is in `types`. The `form_submit` type only controls the attribute detection.

### Groups

A group adds the title of the section a click sits in, such as the heading above a list of links. To send it, set `data-axel-group` on the section:

```html
<section
  data-axel-event="component_click"
  data-axel-group
>
  <h2>Our services</h2>
  <ul>
    <li><a href="/services/repairs">Repairs</a></li>
  </ul>
</section>
```

A click on the link sends `group_title: 'Our services'`.

The script searches the elements that come before the clicked element inside the group. Those are its preceding siblings and their descendants, then the same for each ancestor up to the group. The closest match wins, in this order:

1. An element with `data-axel-group-title`.
2. A heading that matches the `groupTitleSelector` setting, by default `h2`, `h3` or `h4`.

A card heading inside the group also matches `groupTitleSelector`, so a click in a card titled by an `<h3>` sends the card's title as `group_title`. To send the section heading, mark it with `data-axel-group-title`.

Titles inside `data-axel-skip` never count. A group with no match sends an empty `group_title`, and a click outside every group sends none.

The closest group bounds the search, so a nested group takes no title from its parent. When the heading sits outside the markup you render, set `data-axel-group-scope` on the group to a selector for an ancestor that holds the heading. A selector that matches no ancestor keeps the search inside the group.

Subgroups work the same way through `data-axel-subgroup`, `data-axel-subgroup-title` and `data-axel-subgroup-scope`, and send `subgroup_title`. A subgroup title comes only from a `data-axel-subgroup-title` marker, so mark it even when it's a heading.

### Privacy

Field events never carry what a visitor typed or chose: `field_complete` reports the field's name and label only. The script reads no text from inside a `<select>` or `<textarea>`, even when one sits inside a label or a link. Google Analytics forbids personal information in events, and form fields often hold it.

URLs can hold personal information too, such as the token in `/reset?token=abc`. So `link_url` and `form_destination` send each URL without its query string. A `mailto:`, `tel:` or `sms:` URL sends only its scheme, such as `tel:`. The fragment stays, so a link to `#contact` still shows which section it opens. To send every URL as it is, set `fullUrls` to `true` after you've checked your URLs for personal information.

Parameters you render yourself are sent as they are. Keep personal information out of `data-axel-param-*` values and out of your own adapters and collectors.

### Adapters

An adapter sends each event to its destination. The library ships 2 adapters for Google products, and both read `window.dataLayer`:

| Adapter | Sends each event as                                                                      | Use it when                         |
|---------|------------------------------------------------------------------------------------------|-------------------------------------|
| `gtm`   | `window.dataLayer.push({ ...params, event: name })`                                      | Google Tag Manager routes your events |
| `gtag`  | `gtag('event', name, params)`, queued in `window.dataLayer` until the Google tag loads   | The page loads the Google tag directly |

Google Tag Manager reads plain objects from `window.dataLayer`. The Google tag reads only what its own `gtag()` function queues there, so pick the adapter that matches the script your page loads.

To send events to another system, such as Segment or `adobeDataLayer`, load `axel.js` or `axel.drupal.js` and define your adapter in `window.axelAdapter` before the bundle starts:

```html
<script>
  window.axelAdapter = (name, params) =>
    window.analytics.track(name, params);
</script>
<script src="/path/to/axel.min.js"></script>
```

An adapter is a function that receives the event name and parameters, or an object with these methods:

- `send(name, params, context)` delivers the event. `context.debug` is true in debug mode, and `context.settings` holds the instance settings.
- `validate(name, params)` is optional. It returns an array of warning messages, which debug mode prints to the console.

On Drupal, define `window.axelAdapter` in a library that loads on the same pages as `axel.drupal.js`. Drupal attaches behaviors after every library has loaded, so the order of the 2 libraries makes no difference.

### Collectors

A collector is a function that adds parameters when an event happens, such as the position of a result in a list. To report the position of each clicked search result, define a collector in `window.axelCollectors` before the bundle starts:

```html
<script>
  window.axelCollectors = {
    resultPosition(name, params, { element, source }) {
      const item = element.closest('li');

      return { position: String([...source.children].indexOf(item) + 1) };
    },
  };
</script>
```

Then name the collector with `data-axel-collector` on the list:

```html
<ol
  data-axel-event="result_click"
  data-axel-collector="resultPosition"
>
  <li><a href="/storms">Storm safety</a></li>
  <li><a href="/floods">Flood safety</a></li>
</ol>
```

A click on the second link sends `position: '2'`.

A collector receives these arguments:

- `name` is the event name.
- `params` is a copy of the event parameters.
- `element` is the element the event is about, and `source` is the element with `data-axel-collector`.

The collector returns an object, and its entries override every other parameter. The closest `data-axel-collector` wins. Collectors run for every event type, and `formSubmitted()` runs none.

An unknown name, a collector that throws or a result that isn't an object logs an error to the console. The event still goes out, without the collector's parameters.

With `axel.esm.js`, pass the same object as the `collectors` setting. The bundles add `window.axelCollectors` to that setting, which suits Drupal because `drupalSettings` can't hold functions.

### Settings

To change the defaults on a plain page, define `window.axelSettings` before the bundle loads:

```html
<script>
  window.axelSettings = {
    types: ['click', 'form_start', 'field_complete', 'form_submit'],
    properties: { site: 'marketing' },
  };
</script>
<script src="/path/to/axel.gtm.min.js"></script>
```

On Drupal, put the same keys in `drupalSettings.axel`. With `axel.esm.js`, pass them to `init()`.

The following table lists every setting:

| Setting           | Default                                                          | Description                                                                         |
|-------------------|------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `types`           | `['click']`                                                      | Event types to track: `click`, `form_start`, `field_complete` and `form_submit`. The list replaces the default, so include `click` to keep tracking clicks. |
| `adapter`         | None                                                             | The adapter, for `init()` in `axel.esm.js`. The bundles set it themselves and ignore this setting. |
| `properties`      | `{}`                                                             | Static parameters added to every event. Every other parameter overrides them.       |
| `clickSelector`   | `'a[href], button, input[type="submit"], input[type="button"], input[type="reset"]'` | Elements whose clicks the `click` type tracks.                  |
| `groupTitleSelector` | `'h2, h3, h4'`                                                | Headings that title a group without a `data-axel-group-title` marker.               |
| `collectors`      | `{}`                                                             | [Collectors](#collectors) by name.                                                  |
| `fullUrls`        | `false`                                                          | If true, `link_url` and `form_destination` keep the query string and the address of a `mailto:`, `tel:` or `sms:` URL. See [Privacy](#privacy). |
| `debugHash`       | `'#axel-debug'`                                                  | URL hash that turns on debug mode.                                                  |
| `debugStorageKey` | `'axelDebug'`                                                    | `sessionStorage` key that keeps debug mode on until the tab closes.                 |
| `autoInit`        | `true`                                                           | If true, a plain-page bundle starts tracking when it loads. If false, call `window.axel.init()` yourself. Drupal bundles always start in the behavior. |
| `dataLayerName`   | `'dataLayer'`                                                    | Name of the data layer array on `window`. Only the `gtm` and `gtag` adapters read it. |

A missing adapter, an unknown event type or a collector that isn't a function throws an error when the instance is created, so a typo fails before any event is lost.

Every bundle except `axel.esm.js` exposes the class as `window.Axel` and the shared instance as `window.axel`. Call `destroy()` on an instance to stop tracking, and `init()` to start again with the same settings.

### Google Analytics limits

Google Analytics 4 applies these limits to every event:

- An event name has at most 40 characters.
- An event has at most 25 parameters.
- A parameter value has at most 100 characters.
- A standard property has at most 50 event-scoped custom dimensions, and each parameter you report on needs its own dimension.

In debug mode, the `gtm` and `gtag` adapters warn in the console when an event breaks 1 of the first 3 limits.

### Debugging

To log every event to the console, append `#axel-debug` to the URL. Debug mode stays on in that tab and in tabs opened from it until the tab closes, so it holds on the pages your clicks open. Turn on **Preserve log** in the browser console to keep the output across navigations.

In debug mode, the `gtm` and `gtag` adapters add `debug_mode: true` to every event, so Google Analytics lists it in DebugView.

## 🔒 Security

Axel runs on every page that loads it. Here's what a bundle does on the page:

- It reads `data-axel-*` attributes and listens for clicks, focus and field changes on `document`.
- It watches the page for `data-axel-form-submitted` elements added after load.
- It hands each event to the adapter. The adapter, such as Google Tag Manager, makes the network requests; the bundle makes none of its own.
- It stores 1 value: the debug flag in `sessionStorage`. It sets no cookies.

`tests/bundles.test.js` fails when a built bundle contains a network, storage or code-evaluation API, such as `fetch()`, `document.cookie` or `eval()`.

Axel trusts the page that loads it. `window.axelSettings`, `window.axelAdapter` and `window.axelCollectors` carry the same trust as the page's own scripts, because any script on the page can set them. Load the bundle only on pages whose scripts you control.

Anyone can add `#axel-debug` to a URL. Debug mode logs events to that visitor's own console. The `gtm` and `gtag` adapters also add `debug_mode: true` to that visitor's events, so Google Analytics lists them in DebugView.

[`SECURITY.md`](SECURITY.md) explains how to report a vulnerability and how to verify a bundle against its release.

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) to set up a local environment, run the checks and pull updates from the project template. [`docs/architecture/README.md`](docs/architecture/README.md) explains how the library works inside.

---
_This repository was created using the [Scaffold](https://getscaffold.dev/) project template_
