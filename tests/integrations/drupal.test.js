import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MARKUP = '<div data-acl-event="cta_click"><a href="https://example.com/" id="link">Link</a></div>';

describe('Drupal integration', () => {
  let start;
  let adapter;

  beforeEach(async () => {
    vi.resetModules();
    ({ start } = await import('../../src/integrations/drupal.js'));
    adapter = { send: vi.fn() };
    window.Drupal = { behaviors: {} };
    window.drupalSettings = {};
    window.sessionStorage.clear();
    document.body.innerHTML = MARKUP;
  });

  afterEach(() => {
    window.acl?.destroy();
    delete window.Drupal;
    delete window.drupalSettings;
    delete window.aclAdapter;
    delete window.aclCollectors;
    delete window.acl;
    delete window.Acl;
  });

  function attach(context = document) {
    window.Drupal.behaviors.acl.attach(context);
  }

  it('initializes the shared instance from drupalSettings once however many times the behavior attaches', async () => {
    window.drupalSettings.acl = { properties: { site: 'example' } };

    start(adapter);
    const { Acl, init } = await import('../../src/core/core.js');

    expect(window.Acl).toBe(Acl);
    expect(window.acl).toBeUndefined();

    attach();
    attach(document.body);
    document.querySelector('#link').click();

    expect(window.acl).toBe(init());
    expect(adapter.send).toHaveBeenCalledTimes(1);
    expect(adapter.send).toHaveBeenCalledWith(
      'cta_click',
      { site: 'example', link_text: 'Link', click_type: 'link', link_url: 'https://example.com/' },
      expect.any(Object),
    );
  });

  it('initializes with default settings when drupalSettings has none', () => {
    start(adapter);
    attach();

    expect(window.acl.settings.types).toEqual(['click']);
  });

  it('uses the page collectors defined before the behavior attaches', () => {
    const page = vi.fn();

    start(adapter);
    window.aclCollectors = { page };
    attach();

    expect(window.acl.settings.collectors).toEqual({ page });
  });

  it('uses the page adapter defined before the behavior attaches', () => {
    start();
    window.aclAdapter = adapter;
    attach();
    document.querySelector('#link').click();

    expect(adapter.send).toHaveBeenCalledTimes(1);
  });
});
