/**
 * @file
 * The bundle matrix: every integration paired with every adapter.
 *
 * A bundle without an adapter takes it from 'window.axelAdapter'.
 */

export const INTEGRATIONS = [
  { name: 'standalone', suffix: '' },
  { name: 'drupal', suffix: '.drupal' },
];

export const ADAPTERS = [
  { name: 'gtm', suffix: '.gtm' },
  { name: 'gtag', suffix: '.gtag' },
  { name: null, suffix: '' },
];

export const BUNDLES = INTEGRATIONS.flatMap((integration) =>
  ADAPTERS.map((adapter) => ({ file: `axel${integration.suffix}${adapter.suffix}`, integration: integration.name, adapter: adapter.name })),
);

/**
 * Generate the entry point source of a bundle.
 *
 * @param {object} bundle - A BUNDLES item.
 * @return {string} The entry point source.
 */
export function entry(bundle) {
  const lines = [`import { start } from './src/integrations/${bundle.integration}.js';`];

  if (bundle.adapter) {
    lines.push(`import { ${bundle.adapter} } from './src/adapters/${bundle.adapter}.js';`);
  }

  lines.push(`start(${bundle.adapter || ''});`);

  return lines.join('\n');
}
