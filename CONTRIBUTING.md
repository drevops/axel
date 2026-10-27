# Contributing

This guide covers setting up a local environment and running the build, linting and tests.

Install the dependencies and run each check:

    npm install
    npm run build
    npm run lint
    npm run test

`npm run build` writes `build/acl.js` and `build/acl.min.js`. `npm run test` and `npm run test-coverage` run the build first, because the suite also tests both bundles.

To debug the script in a browser, run `npm run build` and open `tests/fixtures/analytics.html#analytics-debug`.
