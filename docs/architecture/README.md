# Architecture

This page walks through how the library works: how the source splits into layers, how the bundles are built from them and how an interaction becomes an event in an adapter. Each section is derived from the source files it names, and diagrams sit next to the prose that discusses them.

This document is generated and maintained by an AI agent via the `update-architecture-docs` skill in `.claude/skills/update-architecture-docs/SKILL.md`. The content is derived from the source code. If this documentation and the code disagree, the code wins.


## Layers

```mermaid
%% Traced from: src/core/*.js, src/core/event-types/*.js, src/adapters/*.js, src/integrations/*.js, src/index.js.
flowchart TB
    subgraph integrations[src/integrations - how it starts]
        standalone[standalone.js<br>window.analyticsContextLayerSettings]
        drupal[drupal.js<br>Drupal.behaviors + drupalSettings]
    end
    subgraph core[src/core - shared by every bundle]
        coreJs[core.js<br>AnalyticsContextLayer, TYPES, init]
        eventTypes[event-types/<br>click, form-start, field-complete, form-submit]
        dom[dom.js<br>listen, getText, getLabel, collectParams, isSkipped, formParams]
    end
    subgraph adapters[src/adapters - where events go]
        gtm[gtm.js]
        gtag[gtag.js]
        ga4[ga4.js<br>debug_mode, GA4 limits, data layer]
    end
    standalone --> coreJs
    drupal --> coreJs
    coreJs --> eventTypes --> dom
    coreJs --> dom
    gtm --> ga4
    gtag --> ga4
    index[src/index.js<br>ES module entry] --> coreJs
    index --> gtm
    index --> gtag
```

The source splits into 3 layers, and no layer imports another layer's siblings:

- `src/core/` turns interactions into events. It holds no Google or Drupal code. `core.js` holds the `AnalyticsContextLayer` class and the `TYPES` registry, which maps each event type name to its module in `event-types/`.
- `src/adapters/` delivers events. An adapter is an object with `send(name, params, context)` and an optional `validate(name, params)`, or a function used as `send()`. `gtm.js` and `gtag.js` share `ga4.js`, which adds `debug_mode` in debug mode, checks the GA4 limits and finds the data layer by `dataLayerName`.
- `src/integrations/` starts the core. Each exports `start(adapter)`, which falls back to `window.analyticsContextLayerAdapter` when no adapter is passed.

The constructor in `core.js` merges the settings over `DEFAULT_SETTINGS`, wraps a function adapter as `{ send }` and throws on a missing adapter or a type name missing from `TYPES`.


## Bundles

```mermaid
%% Traced from: scripts/bundles.js, scripts/build.js.
flowchart LR
    integrations[INTEGRATIONS<br>standalone, drupal] --> matrix
    adapterList[ADAPTERS<br>gtm, gtag, none] --> matrix
    matrix[BUNDLES<br>6 pairs] --> entry[entry: import start + adapter, call start]
    entry --> esbuild[esbuild IIFE<br>plain and minified]
    esbuild --> files[build/acl.integration.adapter.js]
    index[src/index.js] --> esm[esbuild ESM] --> esmFile[build/acl.esm.js]
```

`scripts/bundles.js` pairs every integration with every adapter. A standalone bundle adds no integration segment to its name, and a bundle without an adapter adds no adapter segment, so the 6 bundles are `acl.gtm`, `acl.gtag`, `acl`, `acl.drupal.gtm`, `acl.drupal.gtag` and `acl.drupal`. `entry()` generates each bundle's source: it imports the integration's `start()` and the adapter, then calls `start(adapter)`.

`scripts/build.js` passes each generated entry to esbuild through `stdin` and writes a plain and a minified IIFE to `build/`. esbuild drops the modules a bundle doesn't import, so each bundle holds only its own integration and adapter. `src/index.js` builds separately into `build/acl.esm.js`, which `package.json` points `main`, `module` and `exports` at.


## Starting

The standalone `start()` reads `window.analyticsContextLayerSettings`, exposes the class as `window.AnalyticsContextLayer` and initializes the shared instance straight away, unless `autoInit` is false. Delegated listeners don't need the DOM to be ready, so the script can load in `<head>`.

The Drupal `start()` exposes the class and registers `Drupal.behaviors.analyticsContextLayer`. Its `attach()` calls `init()` with `drupalSettings.analyticsContextLayer` and the adapter. `init()` creates the shared instance on the first call and returns it on later calls, so AJAX attaches change nothing.

Both integrations override any `adapter` key in the settings with their own adapter.


## Lifecycle

`init()` on an instance calls each configured event type module once and stores the cleanup functions it returns. While they are stored, `init()` does nothing, so an instance never binds twice. `destroy()` runs the cleanups, clears them and releases the shared instance when it is the one destroyed, so `init()` can start again.

The `click`, `form_start` and `field_complete` modules add capture-phase listeners on `document` through `listen()`. Capture runs before page handlers can stop propagation, and delegation covers markup added after load. `form_submit` scans the document for `data-analytics-form-submitted` markers and watches it with a `MutationObserver` for markers added later.


## From interaction to adapter

```mermaid
%% Traced from: src/core/event-types/*.js, src/core/core.js track() and send(), src/core/dom.js collectParams(), src/adapters/ga4.js.
sequenceDiagram
    participant Page as document
    participant Type as event type module
    participant ACL as AnalyticsContextLayer
    participant Adapter as adapter
    Page->>Type: click, auxclick, focusin, change or added marker
    Type->>Type: find the target, skip data-analytics-skip, dedupe
    Type->>ACL: track(name, element, derived params)
    ACL->>ACL: derived params, then data-analytics-param-* from element up
    ACL->>ACL: send(): properties first, then the params
    alt debug mode
        ACL->>ACL: log the event
        ACL->>Adapter: validate(name, params)
        Adapter-->>ACL: warnings, printed with console.warn
    end
    ACL->>Adapter: send(name, params, { debug, settings })
```

Each event type decides whether an interaction counts and derives its own parameters:

- `click` takes the closest `clickSelector` match of the target, needs an ancestor with `data-analytics-event` for the name and derives `link_text` and `link_url`. It handles `auxclick` only for the middle button.
- `form_start` takes the closest `data-analytics-form` and records it in a `WeakSet`, so each form element starts once.
- `field_complete` sends on every `change` inside a marked form, with the form parameters, `field_name` and a `field_label` that never reads a value. A radio never reports its own label.
- `form_submit` records each marker in a `WeakSet` and sends its `form_name`. `formSubmitted()` sends the same event directly, whatever the configured types.

`track()` lets `data-analytics-param-*` values override derived parameters, and `send()` puts the `properties` setting underneath both. `isDebug()` reads the debug hash and `sessionStorage` on every send, so debug mode survives navigation within a tab and falls back to the hash when storage is blocked.

The `gtm` adapter pushes `{ ...params, event }` to the data layer, so a parameter named `event` can't replace the event name. The `gtag` adapter calls `window.gtag('event', name, params)` when the Google tag is present, and otherwise pushes an `arguments` object to the data layer, the shape the Google tag reads when it loads.


## Regenerating this document

To update this documentation after a structural change, ask the AI agent to "update architecture docs". The agent re-traces the affected diagrams and prose from the current code via the `update-architecture-docs` skill.
