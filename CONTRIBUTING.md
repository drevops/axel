# Contributing

This guide covers setting up a local environment and running the build, linting and tests.

Install the dependencies and run each check:

    npm install
    npm run build
    npm run lint
    npm run test

`npm run build` runs `scripts/build.js`, which writes every bundle in the matrix from `scripts/bundles.js` to `build/`, plain and minified, plus `build/acl.esm.js`. `npm run test` and `npm run test-coverage` run the build first, because the suite also tests every bundle. `npm run test-coverage` fails below 100% coverage.

To add a bundle for another destination, add its adapter to `src/adapters/` and to `ADAPTERS` in `scripts/bundles.js`. The build and the bundle tests pick it up for both integrations.

Each event type has a fixture in `tests/fixtures/` and a test file of the same name in `tests/`. To debug an event type in a browser, run `npm run build` and open its fixture with `#analytics-debug` appended, such as `tests/fixtures/click.html#analytics-debug`.
