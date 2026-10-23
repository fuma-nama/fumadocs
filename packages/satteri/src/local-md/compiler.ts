import type { Data, MdxCompileOptions } from 'satteri';
import { compileMdx } from '@/compile';
import { applySatteriPreset, type SatteriPresetOptions } from '@/preset';
import { remarkInclude } from '@/remark-include';
import type { StructuredData } from '@/remark-structure';

export type SatteriOptionsInput =
  | SatteriPresetOptions
  | (() => SatteriPresetOptions | Promise<SatteriPresetOptions>);

export interface MarkdownCompilerOptions {
  /** same shape as `@fumadocs/satteri/preset`, or a function returning it */
  satteriOptions?: SatteriOptionsInput;
}

export interface CompileInput {
  path: string;
  value: string;
  data?: Data;
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
  // 'runtime' sets `outputFormat: 'function-body'`, executable via `new Function()`
  const resolved = await applySatteriPreset(options)('runtime');
  return { ...resolved, mdastPlugins: [remarkInclude(), ...(resolved.mdastPlugins ?? [])] };
}

export function createMarkdownCompiler(config: MarkdownCompilerOptions = {}): MarkdownCompiler {
  let resolved: Promise<MdxCompileOptions> | undefined;

  return {
    async compile(input) {
      resolved ??= resolveOptions(config.satteriOptions);
      const options = await resolved;

      const result = await compileMdx({
        source: input.value,
        filePath: input.path,
        environment: 'runtime',
        options: { ...options, data: { ...options.data, ...input.data } },
      });

      return {
        code: result.code,
        filePath: input.path,
        structuredData: result.data.structuredData,
      };
    },
  };
}
