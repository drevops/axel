# AGENTS.md

This file guides AI agents working with the code in this repository.


## Project overview

Analytics Context Layer is a dependency-free browser library. It binds to interactive elements inside components marked with `data-component` and pushes a description of each interaction to the analytics data layer. Releases attach the bundled `build/acl.js` and `build/acl.min.js` as GitHub release assets.

The library is shared across sites, so keep it free of site-specific class names, values and collectors. Site-specific behavior goes in settings or in collector functions defined by the site.


## Structure

- `src/acl.js` - The `AnalyticsContextLayer` class and `DEFAULT_SETTINGS`.
- `src/index.js` - Bundle entry point. Exposes the class and a shared instance on `window`, and attaches when the DOM is ready.
- `tests/acl.test.js` - Behavior tests against `tests/fixtures/analytics.html`.
- `tests/index.test.js` - Entry point tests.
- `tests/bundle.test.js` - Smoke tests for both built bundles.


## Commands

```bash
# Build build/acl.js and build/acl.min.js with esbuild
npm run build

# Run all linters (ESLint, Prettier)
npm run lint

# Auto-fix code style issues
npm run lint-fix

# Build, then run all tests with Vitest and jsdom
npm run test

# Build, then run tests with coverage (reports in .logs/)
npm run test-coverage
```


## CI

- `.github/workflows/test-nodejs.yml` - Lint, build and test on Node.js 22 and 24, with a coverage threshold.
- `.github/workflows/test-actions.yml` - Lint the workflows with yamllint, actionlint and zizmor.
- `.github/workflows/release-nodejs.yml` - Build and attach `build/acl.js` and `build/acl.min.js` to the GitHub release.
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
