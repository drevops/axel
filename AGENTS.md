# AGENTS.md

This file guides AI agents working with the code in this repository.


## Project overview

Axel, the Analytics Context Layer, is a dependency-free browser library. It reads `data-axel-*` attributes the server renders, turns clicks and form interactions into events and hands them to an adapter. Releases attach every bundle in `build/` as GitHub release assets: 1 per integration and adapter pair, each plain and minified, plus `build/axel.esm.js`.

The attributes in `README.md` are the public contract and follow semver: renaming or removing one is a breaking change.

The library is shared across sites, so keep it free of site-specific class names, values and rules. Site-specific behavior goes in the rendered attributes, in settings or in an adapter defined by the site. Google-specific code goes in `src/adapters/`, and Drupal-specific code in `src/integrations/drupal.js`.

Field events must never carry what a visitor typed or chose. The privacy cases in `tests/fixtures/cases.html` guard this for every event type.


## Structure

The source has 3 layers, and each folder holds 1 of them:

- `src/core/` - What every bundle shares. It knows nothing about Google or Drupal.
  - `core.js` - The `Axel` class, `DEFAULT_SETTINGS`, the `TYPES` registry and the shared `init()`.
  - `dom.js` - DOM helpers shared by the event types: listeners, text, labels and parameters.
  - `event-types/` - 1 module per event type: `click`, `form_start`, `field_complete` and `form_submit`.
- `src/adapters/` - Where events go. `gtm.js` and `gtag.js`, with the GA4 rules they share in `ga4.js`.
- `src/integrations/` - How the script starts. `standalone.js` reads `window.axelSettings` on load; `drupal.js` registers a behavior that reads `drupalSettings.axel`.
- `src/index.js` - ES module entry point. Re-exports the core and the adapters.
- `scripts/bundles.js` - The bundle matrix: every integration paired with every adapter, plus 1 bundle per integration that takes its adapter from `window.axelAdapter`.
- `scripts/build.js` - Builds every bundle in the matrix with esbuild, plain and minified, plus `build/axel.esm.js`.
- `tests/fixtures/cases.html` - Every behavior of the library as a case on 1 page: markup, steps in `data-steps` and the expected events. Add a case here before adding a test in code.
- `tests/cases.js` - Reads the cases from the page; `tests/helpers.js` runs their steps in jsdom.
- `tests/core/cases.test.js` - Runs every case in jsdom. `tests/functional/cases.spec.js` runs every case in Chromium with Playwright against `build/axel.gtm.js`.
- `tests/` otherwise mirrors `src/`: `core/`, `adapters/` and `integrations/` hold the tests the page can't express. `tests/bundles.test.js` runs every built bundle and checks that it holds only its own integration and adapter. `tests/core/privacy.property.test.js` checks the privacy promises against random URLs and field values with `fast-check`.


## Commands

```bash
# Build every bundle in the matrix and build/axel.esm.js with esbuild
npm run build

# Run all linters (ESLint, Prettier)
npm run lint

# Auto-fix code style issues
npm run lint-fix

# Build, then run all tests with Vitest and jsdom
npm run test

# Build, then run tests with coverage, failing below 100% (reports in .logs/)
npm run test-coverage

# Build, then run every case in tests/fixtures/cases.html in Chromium
# (install the browser once with "npx playwright install chromium")
npm run test-functional
```


## CI

- `.github/workflows/test-nodejs.yml` - Lint, build, unit test and functional test on Node.js 22 and 24, with a coverage threshold.
- `.github/workflows/audit.yml` - Audit the repository's security practices with OpenSSF Scorecard, publishing the results from `main`, and scan the JavaScript and the workflows for vulnerabilities with CodeQL.
- `.github/workflows/release-nodejs.yml` - On a pushed version tag, build every bundle and attest its provenance, rename Release Drafter's draft to the tag's version, attach the bundles, `checksums.txt`, `axel.intoto.jsonl` and SRI hashes, then publish it.
- `.github/workflows/draft-release-notes.yml` - Draft release notes with Release Drafter on every push to `main`.


## Architecture documentation

Architecture documentation lives in `docs/architecture/`. It is generated and maintained by an AI agent via the `update-architecture-docs` skill in `.claude/skills/update-architecture-docs/SKILL.md`.

After any structural change to the codebase, update it by invoking the skill (say "update architecture docs").

The content is derived from the source code. If the documentation and the code disagree, the code wins.


## Updating from the template

This project was generated from a template and can pull the template's latest
infrastructure (CI workflows, linting and test configuration, Docker, and docs)
at any time. When you are asked to "update scaffold", fetch the updater skill
from the template repository into the local `.claude/skills/` directory, then
invoke it:

1. Create the target directory if it does not exist:

   ```bash
   mkdir -p .claude/skills/update-consumer-scaffold
   ```

2. Download the skill:

   ```bash
   curl -sSL https://raw.githubusercontent.com/AlexSkrypnyk/scaffold/main/.scaffold/skills/update-consumer-scaffold/SKILL.md -o .claude/skills/update-consumer-scaffold/SKILL.md
   ```

3. Invoke the `update-consumer-scaffold` skill and follow its steps.

The skill directory is fetched on demand and is git-ignored - it is not
committed to the project.
