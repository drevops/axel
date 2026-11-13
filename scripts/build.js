/**
 * @file
 * Build every bundle in the matrix, plain and minified, and the ES module.
 */

import { build } from 'esbuild';
import { join } from 'node:path';
import { BUNDLES, entry } from './bundles.js';

const root = join(import.meta.dirname, '..');
const options = { bundle: true, target: 'es2018', logLevel: 'info', absWorkingDir: root };

const builds = BUNDLES.flatMap((bundle) =>
  [false, true].map((minify) =>
    build({
      ...options,
      stdin: { contents: entry(bundle), resolveDir: root, sourcefile: `${bundle.file}.js` },
      format: 'iife',
      minify,
      outfile: `dist/${bundle.file}${minify ? '.min' : ''}.js`,
    }),
  ),
);

builds.push(build({ ...options, entryPoints: ['src/index.js'], format: 'esm', outfile: 'dist/axel.esm.js' }));

await Promise.all(builds);
