# Contributing

This guide covers setting up a local environment and running the build, linting and tests.

Install the dependencies and run each check:

    npm install
    npm run build
    npm run lint
    npm run test

`npm run build` runs `scripts/build.js`, which writes every bundle in the matrix from `scripts/bundles.js` to `build/`, plain and minified, plus `build/axel.esm.js`. `npm run test`, `npm run test-coverage` and `npm run test-functional` run the build first, because the suites also test the built bundles. `npm run test-coverage` fails below 100% coverage.

To add a bundle for another destination, add its adapter to `src/adapters/` and to `ADAPTERS` in `scripts/bundles.js`. The build and the bundle tests pick it up for both integrations.

## Test cases

`tests/fixtures/cases.html` holds every behavior of the library as a case on 1 page. Each case is a section with a title, its markup, the steps to run in `data-steps` and the events it pushes in a `<pre class="expected">` block. The comment at the top of the page lists the steps.

The 2 suites run every case on the page:

- `npm run test` runs them in jsdom through `tests/core/cases.test.js`, which also counts toward coverage.
- `npm run test-functional` runs them in Chromium through `tests/functional/cases.spec.js`, against `build/axel.gtm.js`.

Before the first functional run, install Chromium for Playwright:

    npx playwright install chromium

To add a case, add a section to the page. Both suites pick it up. To try a case by hand, run `npm run build` and open `tests/fixtures/cases.html` in a browser. The **Events** panel and the console list every event the page pushes, and the buttons in the `form_submit` cases run their insert and hook steps. Add `#axel-debug` to the URL to also see the library's own log and GA4 limit warnings.

## Issues and pull requests

Report a bug or request a feature in [GitHub issues](https://github.com/drevops/axel/issues). Report a vulnerability privately instead, as [`SECURITY.md`](SECURITY.md) describes.

To submit a change, open a pull request against `main`. A pull request merges after these checks pass:

- `npm run lint` reports no errors.
- `npm run test-coverage` passes with 100% coverage.
- `npm run test-functional` passes in Chromium.
- New behavior has a case in `tests/fixtures/cases.html`.

## Releases

Release Drafter keeps 1 draft release and adds every pull request merged into `main` to its notes. A release goes out when a maintainer pushes its tag, and only maintainers can create tags.

Release only by pushing the tag. Never click **Publish release** on the draft: releases are immutable, so a release published before the workflow runs can never get its bundles.

To publish a release:

1. Open the draft release on GitHub and edit its notes, if they need it. The draft's version is Release Drafter's guess, and the tag you push replaces it.
2. Tag the commit on `main` with the version and push the tag:

       git tag 1.2.3
       git push origin 1.2.3

The `release-nodejs.yml` workflow builds the bundles and attests their provenance. It renames the draft to the tag's version and fixes the version in its compare link, or creates a release with generated notes when no draft exists. It attaches the bundles, `checksums.txt` and `axel.intoto.jsonl`, adds the Subresource Integrity hashes to the notes and then publishes the release. Releases are immutable, so a published release keeps its assets and its tag.

## Template updates

This project was generated from the [Scaffold](https://getscaffold.dev/) template. To pull the template's latest infrastructure into this project, ask Claude Code to "update scaffold". [`AGENTS.md`](AGENTS.md) lists the steps the agent follows.
