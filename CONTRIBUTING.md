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

- `npm run test` runs them in jsdom through `tests/core/cases.test.js`, which also counts towards coverage.
- `npm run test-functional` runs them in Chromium through `tests/functional/cases.spec.js`, against `build/axel.gtm.js`.

Before the first functional run, install Chromium for Playwright:

    npx playwright install chromium

To add a case, add a section to the page. Both suites pick it up. To try a case by hand, run `npm run build` and open `tests/fixtures/cases.html` in a browser. The **Events** panel and the console list every event the page pushes, and the buttons in the `form_submit` cases run their insert and hook steps. Add `#axel-debug` to the URL to also see the library's own log and GA4 limit warnings.
