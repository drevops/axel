/**
 * @file
 * Read the cases of 'tests/fixtures/cases.html'.
 */

/**
 * Read every case on the page.
 *
 * The function uses nothing outside its body, so the functional tests can
 * run it inside the browser page.
 *
 * @param {Document} doc - The document holding the page.
 * @return {object[]} The cases, each with its 'id', 'title', 'load' flag,
 *   'steps' and 'expected' events, with URLs resolved against the page.
 */
export function readCases(doc = document) {
  // Parse 1 step, such as 'click #id' or 'fill #id = text'.
  const parseStep = (text) => {
    const trimmed = text.trim();
    const space = trimmed.indexOf(' ');
    const [target, value] = trimmed.slice(space + 1).split(' = ');

    return { action: trimmed.slice(0, space), target, value };
  };

  const resolve = (event) => {
    const resolved = { ...event };

    ['link_url', 'form_destination']
      .filter((name) => name in resolved)
      .forEach((name) => {
        resolved[name] = new URL(resolved[name], doc.baseURI).href;
      });

    return resolved;
  };

  return [...doc.querySelectorAll('.case')].map((element) => {
    const steps = element.dataset.steps;

    return {
      id: element.id,
      title: element.querySelector(':scope > h3').textContent.trim(),
      load: steps === 'load',
      steps: steps === 'load' ? [] : steps.split(';').map(parseStep),
      expected: JSON.parse(element.querySelector(':scope > .expected').textContent).map(resolve),
    };
  });
}

/**
 * List the ID, title and load flag of every case from the page source.
 *
 * The functional tests use it to name their tests before a browser opens.
 *
 * @param {string} html - The page source.
 * @return {{id: string, title: string, load: boolean}[]} The cases.
 */
export function listCases(html) {
  const pattern = /<section class="case" id="([^"]+)" data-steps=(["'])(.*?)\2>\s*<h3>([^<]+)<\/h3>/g;

  return [...html.matchAll(pattern)].map(([, id, , steps, title]) => ({ id, title, load: steps === 'load' }));
}
