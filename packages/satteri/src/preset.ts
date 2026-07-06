import '@/data-map';
import type { HastPluginInput, MdxCompileOptions, MdxOnlyOptions } from 'satteri';
import type { BuildEnvironment } from '@/types';
import { remarkHeading, type RemarkHeadingOptions } from '@/remark-heading';
import { remarkImage, type RemarkImageOptions } from '@/remark-image';
import { remarkCodeTab, type RemarkCodeTabOptions } from '@/remark-code-tab';
import { remarkNpm, type RemarkNpmOptions } from '@/remark-npm';
import { remarkStructure, type StructureOptions } from '@/remark-structure';
import { rehypeCode, type RehypeCodeOptions } from '@/rehype-code';
import { rehypeToc } from '@/rehype-toc';
import { rehypeTable } from '@/rehype-table';
import type { MdastPluginInput } from 'satteri';

type ResolvePlugins<T> = T[] | ((plugins: T[]) => T[]);

export type DefaultSatteriOptions = Omit<MdxCompileOptions, 'mdastPlugins' | 'hastPlugins'> & {
  mdastPlugins?: ResolvePlugins<MdastPluginInput>;
  hastPlugins?: ResolvePlugins<HastPluginInput>;
  valueToExport?: string[];
  remarkStructureOptions?: StructureOptions | false;
  remarkHeadingOptions?: RemarkHeadingOptions;
  remarkImageOptions?: RemarkImageOptions | false;
  remarkCodeTabOptions?: RemarkCodeTabOptions | false;
  remarkNpmOptions?: RemarkNpmOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
};

export type SatteriPresetOptions =
  | ({ preset?: 'fumadocs' } & DefaultSatteriOptions)
  | ({
      preset: 'minimal';
    } & MdxOnlyOptions &
      Pick<MdxCompileOptions, 'mdastPlugins' | 'hastPlugins' | 'features' | 'data'>);

function pluginOption<T>(
  def: (plugins: T[]) => (T | false)[],
  options: ResolvePlugins<T> = [],
): T[] {
  const list = def(Array.isArray(options) ? options : []).filter(Boolean) as T[];
  if (typeof options === 'function') return options(list);
  return list;
}

const RESOLVED_PRESET = Symbol.for('fumadocs.satteri.resolved-preset');

export function applySatteriPreset(
  options: SatteriPresetOptions = {},
): (environment: BuildEnvironment) => Promise<MdxCompileOptions> {
  return async (environment = 'bundler') => {
    // already-resolved options (e.g. a config that applied the preset itself):
    // applying the preset again would duplicate the default plugins, so
    // double-highlighting code blocks and double-wrapping code tabs
    if (RESOLVED_PRESET in options) {
      const resolved = options as MdxCompileOptions;
      return {
        ...resolved,
        outputFormat: environment === 'runtime' ? 'function-body' : resolved.outputFormat,
      };
    }

    if (options.preset === 'minimal') {
      const { preset: _preset, ...rest } = options;
      return markResolved({
        ...rest,
        outputFormat: environment === 'runtime' ? 'function-body' : rest.outputFormat,
      });
    }

    const {
      valueToExport = [],
      rehypeCodeOptions,
      remarkImageOptions,
      remarkHeadingOptions,
      remarkStructureOptions,
      remarkCodeTabOptions,
      remarkNpmOptions,
      mdastPlugins,
      hastPlugins,
      features,
      data,
      ...rest
    } = options;

    const resolvedMdast = pluginOption<MdastPluginInput>(
      (plugins) => [
        remarkHeading({
          generateToc: false,
          ...remarkHeadingOptions,
        }),
        remarkImageOptions !== false && remarkImage(remarkImageOptions),
        remarkCodeTabOptions !== false && remarkCodeTab(remarkCodeTabOptions),
        remarkNpmOptions !== false && remarkNpm(remarkNpmOptions),
        ...plugins,
        remarkStructureOptions !== false &&
          remarkStructure({
            exportAs: 'structuredData',
            ...remarkStructureOptions,
          }),
      ],
      mdastPlugins,
    );

    const resolvedHast = pluginOption<HastPluginInput>(
      (plugins) => [
        rehypeCodeOptions !== false &&
          rehypeCode({
            tab: false,
            ...rehypeCodeOptions,
          }),
        ...plugins,
        rehypeTable(),
        rehypeToc(),
      ],
      hastPlugins,
    );

    return markResolved({
      ...rest,
      data: {
        ...data,
        ...(valueToExport.length > 0 ? { _valueToExport: valueToExport } : {}),
      },
      outputFormat: environment === 'runtime' ? 'function-body' : rest.outputFormat,
      features: {
        gfm: true,
        directive: true,
        ...features,
      },
      mdastPlugins: resolvedMdast,
      hastPlugins: resolvedHast,
    });
  };
}

function markResolved(options: MdxCompileOptions): MdxCompileOptions {
  Object.defineProperty(options, RESOLVED_PRESET, { value: true });
  return options;
}
