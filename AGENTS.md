# AGENTS.md

This file guides AI agents working with the code in this repository.


## Project overview

Analytics Context Layer is a dependency-free browser library. It reads `data-analytics-*` attributes the server renders, turns clicks and form interactions into events and sends them to a sink. Releases attach the bundled `build/acl.js`, `build/acl.min.js` and `build/acl.esm.js` as GitHub release assets.

The attributes in `README.md` are the public contract and follow semver: renaming or removing one is a breaking change.

The library is shared across sites, so keep it free of site-specific class names, values and rules. Site-specific behavior goes in the rendered attributes, in settings or in a custom sink defined by the site.

Field events must never carry what a visitor typed or chose. `tests/privacy.test.js` guards this for every event type.


## Structure

- `src/acl.js` - The `AnalyticsContextLayer` class, `DEFAULT_SETTINGS`, the `TYPES` registry and the shared `init()`.
- `src/dom.js` - DOM helpers shared by the event types: listeners, text, labels and parameters.
- `src/sinks.js` - The `dataLayer`, `gtag` and custom-function sinks.
- `src/types/` - 1 module per event type: `click`, `form_start`, `field_complete` and `form_submit`.
- `src/index.js` - Bundle entry point. Exposes the class and the shared instance on `window` and initializes it unless `autoInit` is false.
- `tests/<type>.test.js` - Behavior tests for each event type against `tests/fixtures/<type>.html`.
- `tests/acl.test.js`, `tests/sinks.test.js` and `tests/privacy.test.js` - Core, sink and privacy tests.
- `tests/index.test.js` - Entry point tests.
- `tests/bundle.test.js` - Smoke tests for every built bundle.


## Commands

```bash
# Build build/acl.js, build/acl.min.js and build/acl.esm.js with esbuild
npm run build

# Run all linters (ESLint, Prettier)
npm run lint

# Auto-fix code style issues
npm run lint-fix

# Build, then run all tests with Vitest and jsdom
npm run test

# Build, then run tests with coverage, failing below 100% (reports in .logs/)
npm run test-coverage
```


## CI

- `.github/workflows/test-nodejs.yml` - Lint, build and test on Node.js 22 and 24, with a coverage threshold.
- `.github/workflows/test-actions.yml` - Lint the workflows with yamllint, actionlint and zizmor.
- `.github/workflows/release-nodejs.yml` - Build and attach `build/acl.js`, `build/acl.min.js` and `build/acl.esm.js` to the GitHub release.
- `.github/workflows/draft-release-notes.yml` - Draft release notes with Release Drafter.


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
