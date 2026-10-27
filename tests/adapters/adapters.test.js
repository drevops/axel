import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIMITS, validate } from '../../src/adapters/ga4.js';
import { gtag } from '../../src/adapters/gtag.js';
import { gtm } from '../../src/adapters/gtm.js';

const PARAMS = { link_text: 'Go', component: 'hero' };
const CONTEXT = { debug: false, settings: {} };
const DEBUG = { debug: true, settings: {} };

describe('adapters', () => {
  afterEach(() => {
    delete window.dataLayer;
    delete window.customLayer;
    delete window.gtag;
  });

  describe('gtm', () => {
    it.each([
      ['an empty data layer', undefined, 1],
      ['a data layer with entries', [{ event: 'earlier' }], 2],
    ])('pushes an event object to %s', (_description, dataLayer, length) => {
      window.dataLayer = dataLayer;
      gtm.send('cta_click', PARAMS, CONTEXT);

      expect(window.dataLayer).toHaveLength(length);
      expect(window.dataLayer.at(-1)).toEqual({ event: 'cta_click', ...PARAMS });
    });

    it('pushes to a custom data layer name', () => {
      gtm.send('cta_click', PARAMS, { debug: false, settings: { dataLayerName: 'customLayer' } });

      expect(window.customLayer).toEqual([{ event: 'cta_click', ...PARAMS }]);
      expect(window.dataLayer).toBeUndefined();
    });

    it('keeps the event name when a parameter is called event', () => {
      gtm.send('cta_click', { event: 'other' }, CONTEXT);

      expect(window.dataLayer).toEqual([{ event: 'cta_click' }]);
    });

    it('flags events for GA4 DebugView in debug mode', () => {
      gtm.send('cta_click', PARAMS, DEBUG);

      expect(window.dataLayer).toEqual([{ event: 'cta_click', ...PARAMS, debug_mode: true }]);
    });
  });

  describe('gtag', () => {
    it.each([
      ['outside debug mode', CONTEXT, PARAMS],
      ['in debug mode', DEBUG, { ...PARAMS, debug_mode: true }],
    ])('sends the event through the Google tag %s', (_description, context, expected) => {
      window.gtag = vi.fn();
      gtag.send('cta_click', PARAMS, context);

      expect(window.gtag).toHaveBeenCalledWith('event', 'cta_click', expected);
      expect(window.dataLayer).toBeUndefined();
    });

    it.each([
      ['an empty data layer', undefined, 1],
      ['a data layer with entries', ['earlier'], 2],
    ])('queues the event in %s when the Google tag is missing', (_description, dataLayer, length) => {
      window.dataLayer = dataLayer;
      gtag.send('cta_click', PARAMS, CONTEXT);

      expect(window.dataLayer).toHaveLength(length);
      expect(Object.prototype.toString.call(window.dataLayer.at(-1))).toBe('[object Arguments]');
      expect([...window.dataLayer.at(-1)]).toEqual(['event', 'cta_click', PARAMS]);
    });
  });

  describe('GA4 validation', () => {
    it('is shared by both Google adapters', () => {
      expect(gtm.validate).toBe(validate);
      expect(gtag.validate).toBe(validate);
    });

    it.each([
      ['an event within the limits', 'cta_click', { a: 'x'.repeat(LIMITS.paramValue) }, []],
      ['a long event name', 'x'.repeat(LIMITS.eventName + 1), {}, ['event name is longer than 40 characters.']],
      [
        'too many parameters',
        'cta_click',
        Object.fromEntries(Array.from({ length: LIMITS.params + 1 }, (_value, index) => [`p${index}`, index])),
        ['more than 25 parameters.'],
      ],
      [
        'long parameter values',
        'cta_click',
        { a: 'x'.repeat(LIMITS.paramValue + 1), b: 1, c: 'y'.repeat(LIMITS.paramValue + 1) },
        ['"a" is longer than 100 characters.', '"c" is longer than 100 characters.'],
      ],
    ])('warns about %s', (_description, name, params, warnings) => {
      expect(validate(name, params)).toEqual(warnings);
    });
  });
});
