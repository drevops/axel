import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsContextLayer } from '../src/acl.js';
import { createSink, dataLayerSink, gtagSink } from '../src/sinks.js';

const PARAMS = { link_text: 'Go', component: 'hero' };

describe('sinks', () => {
  afterEach(() => {
    delete window.dataLayer;
    delete window.customLayer;
    delete window.gtag;
  });

  it.each([
    ['an empty data layer', undefined, 1],
    ['a data layer with entries', [{ event: 'earlier' }], 2],
  ])('dataLayer pushes an event object to %s', (_description, dataLayer, length) => {
    window.dataLayer = dataLayer;
    dataLayerSink('dataLayer')('cta_click', PARAMS);

    expect(window.dataLayer).toHaveLength(length);
    expect(window.dataLayer.at(-1)).toEqual({ event: 'cta_click', ...PARAMS });
  });

  it('dataLayer pushes to a custom data layer name', () => {
    dataLayerSink('customLayer')('cta_click', PARAMS);

    expect(window.customLayer).toEqual([{ event: 'cta_click', ...PARAMS }]);
    expect(window.dataLayer).toBeUndefined();
  });

  it('gtag sends the event through the Google tag', () => {
    window.gtag = vi.fn();
    gtagSink('dataLayer')('cta_click', PARAMS);

    expect(window.gtag).toHaveBeenCalledWith('event', 'cta_click', PARAMS);
    expect(window.dataLayer).toBeUndefined();
  });

  it.each([
    ['an empty data layer', undefined, 1],
    ['a data layer with entries', ['earlier'], 2],
  ])('gtag queues the event in %s when the Google tag is missing', (_description, dataLayer, length) => {
    window.dataLayer = dataLayer;
    gtagSink('dataLayer')('cta_click', PARAMS);

    expect(window.dataLayer).toHaveLength(length);
    expect(Object.prototype.toString.call(window.dataLayer.at(-1))).toBe('[object Arguments]');
    expect([...window.dataLayer.at(-1)]).toEqual(['event', 'cta_click', PARAMS]);
  });

  it('passes a custom function through', () => {
    const sink = vi.fn();

    expect(createSink(sink, 'dataLayer')).toBe(sink);
  });

  it('sends events to a custom function', () => {
    const sink = vi.fn();

    new AnalyticsContextLayer({ sink, properties: { site: 'example' } }).send('cta_click', PARAMS);

    expect(sink).toHaveBeenCalledWith('cta_click', { site: 'example', ...PARAMS });
  });

  it.each([
    ['dataLayer', 'dataLayer'],
    ['gtag', 'gtag'],
  ])('resolves the %s sink by name', (name) => {
    window.gtag = vi.fn();
    window.dataLayer = [];
    createSink(name, 'dataLayer')('cta_click', PARAMS);

    expect(window.dataLayer.length + window.gtag.mock.calls.length).toBe(1);
  });
});
