import path from 'node:path';
import picomatch from 'picomatch';
import { slash } from '@/utils/codegen';

export interface MacroOptions {
  /**
   * Patterns of modules that may use the macro API, relative to the project root.
   * `node_modules` is always excluded.
   *
   * @defaultValue all JS/TS files
   */
  include?: string | string[];
}

/**
 * `false` disables the macro API.
 */
export type MacroPluginOption = MacroOptions | false;

export const MacroModuleId = 'fumadocs-mdx/macro';

export interface ResolvedMacroOptions {
  include: string[];
}

/**
 * Modules in `node_modules` never use the macro API.
 */
export const NodeModulesRegex = /[\\/]node_modules[\\/]/;

/**
 * One pattern per extension: brace expansion (`*.{js,ts}`) isn't understood by every glob engine
 * these are handed to (Turbopack rule keys in particular).
 */
const DefaultInclude = ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.ts', '**/*.tsx', '**/*.mts'];

/**
 * Match absolute paths of modules, including those outside of root (e.g. workspace packages).
 *
 * @param root - project root, `include` patterns are relative to it
 */
export function createMacroMatcher(
  root: string,
  { include }: ResolvedMacroOptions,
): (file: string) => boolean {
  const isIncluded = picomatch(include, { basename: true, windows: true });

  return (file) => !NodeModulesRegex.test(file) && isIncluded(slash(path.relative(root, file)));
}

/**
 * @returns `undefined` when the macro API is disabled.
 */
export function resolveMacroOptions(
  option: MacroPluginOption | undefined,
): ResolvedMacroOptions | undefined {
  if (option === false) return;
  const { include = DefaultInclude } = option ?? {};

  return { include: typeof include === 'string' ? [include] : include };
}
