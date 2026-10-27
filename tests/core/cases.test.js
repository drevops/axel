import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../src/adapters/gtm.js';
import { Axel, TYPES } from '../../src/core/core.js';
import { readCases } from '../cases.js';
import { flushMutations, loadFixture, runStep } from '../helpers.js';

loadFixture();

const CASES = readCases(document);

describe('cases.html', () => {
  let axel;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    axel = new Axel({ adapter: gtm, types: Object.keys(TYPES) }).init();
    window.axel = axel;
  });

  afterEach(() => {
    axel.destroy();
    delete window.axel;
    delete window.dataLayer;
  });

  it('sends the events of the cases rendered with the page on load', () => {
    expect(window.dataLayer).toEqual(CASES.filter((item) => item.load).flatMap((item) => item.expected));
  });

  it.each(CASES.filter((item) => !item.load))('$id: $title', async ({ steps, expected }) => {
    const loaded = window.dataLayer.length;

    steps.forEach(runStep);
    await flushMutations();

    expect(window.dataLayer.slice(loaded)).toEqual(expected);
  });
});
