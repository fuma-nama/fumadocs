import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

/**
 * `dts` options to emit declarations with the TypeScript of the workspace, for packages depending on a TypeScript version that rolldown-plugin-dts doesn't support.
 */
export function workspaceTsgo() {
  const dir = path.dirname(require.resolve('typescript/package.json'));
  const { default: getExePath } = require(path.join(dir, 'lib/getExePath.js'));

  return { generator: 'tsgo' as const, tsgo: { path: getExePath() as string } };
}
