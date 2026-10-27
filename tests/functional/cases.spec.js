import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { listCases, readCases } from '../cases.js';
import { FIXTURE } from '../helpers.js';

// The page loads build/acl.gtm.js, so run "npm run build" first.
const PAGE = pathToFileURL(FIXTURE).href;

// Each step is a real browser interaction.
const ACTIONS = {
  click: (page, target) => page.locator(target).click(),
  'middle-click': (page, target) => page.locator(target).click({ button: 'middle' }),
  'right-click': (page, target) => page.locator(target).click({ button: 'right' }),
  focus: (page, target) => page.locator(target).focus(),
  change: (page, target) => page.locator(target).dispatchEvent('change'),
  fill: async (page, target, value) => {
    await page.locator(target).fill(value);
    await page.locator(target).blur();
  },
  check: (page, target) => page.locator(target).check(),
  select: async (page, target, value) => {
    await page.locator(target).focus();
    await page.locator(target).selectOption(value);
  },
  insert: (page, target, value) =>
    page.evaluate(([to, from]) => document.querySelector(to).append(document.querySelector(from).content.cloneNode(true)), [target, value]),
  hook: (page, target, value) => page.evaluate(([name, params]) => window.analyticsContextLayer.formSubmitted(name, JSON.parse(params)), [target, value]),
};

function dataLayer(page, from = 0) {
  return page.evaluate((start) => window.dataLayer.slice(start), from);
}

// The cases are read inside the page, so the browser resolves their URLs.
async function cases(page) {
  return page.evaluate(readCases);
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test('sends the events of the cases rendered with the page on load', async ({ page }) => {
  const expected = (await cases(page)).filter((item) => item.load).flatMap((item) => item.expected);

  expect(await dataLayer(page)).toEqual(expected);
});

const LISTED = listCases(readFileSync(FIXTURE, 'utf8'));

test('lists every case on the page', async ({ page }) => {
  expect(LISTED.map((item) => item.id)).toEqual((await cases(page)).map((item) => item.id));
});

for (const { id, title } of LISTED.filter((item) => !item.load)) {
  test(`${id}: ${title}`, async ({ page }) => {
    const { steps, expected } = (await cases(page)).find((item) => item.id === id);
    const loaded = (await dataLayer(page)).length;

    for (const { action, target, value } of steps) {
      await ACTIONS[action](page, target, value);
    }

    await expect.poll(() => dataLayer(page, loaded)).toEqual(expected);
  });
}
