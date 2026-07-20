import { mdxToJs, type Data, type MdxCompileOptions } from 'satteri';
import { pathToFileURL } from 'node:url';
import { applySatteriPreset, type SatteriPresetOptions } from '@/preset';
import type { StructuredData } from '@/remark-structure';

export type SatteriOptionsInput =
  | SatteriPresetOptions
  | (() => SatteriPresetOptions | Promise<SatteriPresetOptions>);

export interface MarkdownCompilerOptions {
  /**
   * Sätteri compiler options, resolved through the Fumadocs preset.
   *
   * Accepts the same shape as `@fumadocs/satteri/preset`, or a function
   * returning it.
   */
  satteriOptions?: SatteriOptionsInput;
}

export interface CompileInput {
  path: string;
  value: string;
  data?: {
    frontmatter?: Record<string, unknown>;
  };
}

export interface CompileResult {
  /** compiled function-body JavaScript. */
  code: string;
  filePath: string;
  structuredData?: StructuredData;
}

export interface MarkdownCompiler {
  compile: (input: CompileInput) => Promise<CompileResult>;
}

async function resolveOptions(input: SatteriOptionsInput | undefined): Promise<MdxCompileOptions> {
  const options = typeof input === 'function' ? await input() : input;
  // `'runtime'` sets `outputFormat: 'function-body'` so the output can be
  // executed with `new Function()`/`new AsyncFunction()` at render time.
  return applySatteriPreset(options)('runtime');
}

export function createMarkdownCompiler(config: MarkdownCompilerOptions = {}): MarkdownCompiler {
  let resolved: Promise<MdxCompileOptions> | undefined;

  return {
    async compile(input) {
      resolved ??= resolveOptions(config.satteriOptions);
      const options = await resolved;

      const data: Data = { ...options.data };
      // seed frontmatter so plugins (e.g. remark-structure openapi seeding)
      // can read it; it is *not* re-exported into the compiled code.
      if (input.data?.frontmatter) data.frontmatter = input.data.frontmatter;

      // Call `mdxToJs` directly instead of `@fumadocs/satteri/compile`'s
      // `compileMdx`: the latter appends `export const frontmatter/structuredData`
      // statements after the function body, which is invalid in `function-body`
      // output. The plugin visitors still run here, populating
      // `result.data.structuredData` and injecting the `toc` ESM node into the
      // tree, so we read structured data from `data` and let `toc` default to
      // `[]` when the document has no headings.
      const result = await mdxToJs(input.value, {
        ...options,
        outputFormat: 'function-body',
        fileURL: options.fileURL ?? pathToFileURL(input.path),
        data,
      });

      return {
        code: result.code,
        filePath: input.path,
        structuredData: result.data.structuredData,
      };
    },
  };
}
