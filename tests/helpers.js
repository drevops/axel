import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Replace the document body with the body of a fixture.
 *
 * The fixtures also run in a browser, so their scripts are left out.
 *
 * @param {string} name - The fixture file name without the extension.
 */
export function loadFixture(name) {
  const html = readFileSync(join(import.meta.dirname, 'fixtures', `${name}.html`), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');

  document.body.innerHTML = body;
}

/**
 * Wait for pending mutation observer callbacks.
 *
 * @return {Promise<void>} Resolves on the next task.
 */
export function flushMutations() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
