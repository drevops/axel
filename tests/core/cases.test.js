import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gtm } from '../../src/adapters/gtm.js';
import { Acl, TYPES } from '../../src/core/core.js';
import { readCases } from '../cases.js';
import { flushMutations, loadFixture, runStep } from '../helpers.js';

loadFixture();

const CASES = readCases(document);

describe('cases.html', () => {
  let acl;

  beforeEach(() => {
    loadFixture();
    window.dataLayer = [];
    window.sessionStorage.clear();

    acl = new Acl({ adapter: gtm, types: Object.keys(TYPES) }).init();
    window.acl = acl;
  });

  afterEach(() => {
    acl.destroy();
    delete window.acl;
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
