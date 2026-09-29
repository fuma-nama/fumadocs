import {
  markdownToJs,
  mdxToJs,
  type Data,
  type HastPluginDefinition,
  type MdxCompileOptions,
  type MdxToJsResult,
} from 'satteri';
import { pathToFileURL } from 'node:url';

export type DocumentFormat = 'md' | 'mdx';

export interface CompileMdxOptions {
  source: string;
  filePath: string;
  /**
   * Which parser to use.
   *
   * Defaults to the `filePath` extension, so a `.md` file is not silently given
   * MDX semantics.
   */
  format?: DocumentFormat;
  frontmatter?: Record<string, unknown>;
  isDevelopment?: boolean;
  environment?: 'bundler' | 'runtime';
  options: MdxCompileOptions;
}

export type CompileMdxResult = MdxToJsResult;

export type OutputFormat = 'program' | 'function-body';

export interface AfterToJsContext {
  result: MdxToJsResult;
  outputFormat: OutputFormat;
}

export interface CollectExportsContext {
  data: Data;
  /** declare `export const <name> = <valueCode>`, a repeated name replaces the earlier one */
  addExport: (name: string, valueCode: string) => void;
}

export interface ExtraPluginHooks {
  /**
   * Declare module exports. Runs after every plugin has seen the document, so
   * `data` is final. Exports go into the tree as an ESM node, so the compiler
   * emits them correctly for either output format.
   */
  collectExports?: (opts: CollectExportsContext) => void;
  /** post-process the generated code, use {@link collectExports} for exports */
  afterToJs?: (opts: AfterToJsContext) => void;
}

export async function compileMdx({
  source,
  filePath,
  format = filePath.endsWith('.mdx') ? 'mdx' : 'md',
  frontmatter,
  isDevelopment = false,
  environment = 'bundler',
  options: { mdastPlugins = [], hastPlugins = [], ...satteriOptions },
}: CompileMdxOptions): Promise<CompileMdxResult> {
  const data: Data = { ...satteriOptions.data };
  if (frontmatter) data.frontmatter = frontmatter;
  const plugins = [...mdastPlugins, ...hastPlugins] as ExtraPluginHooks[];

  const outputFormat: OutputFormat =
    environment === 'runtime' ? 'function-body' : (satteriOptions.outputFormat ?? 'program');

  const compileOptions: MdxCompileOptions = {
    ...satteriOptions,
    mdastPlugins,
    // ordered last so it runs after the plugins whose exports it collects
    hastPlugins: [...hastPlugins, exportsPlugin(plugins)],
    development: isDevelopment,
    outputFormat,
    fileURL: satteriOptions.fileURL ?? pathToFileURL(filePath),
    data,
    features: {
      gfm: true,
      frontmatter: false,
      directive: true,
      ...satteriOptions.features,
    },
  };

  const result = await (format === 'md'
    ? markdownToJs(source, compileOptions)
    : mdxToJs(source, compileOptions));

  for (const plugin of plugins) {
    plugin.afterToJs?.({ result, outputFormat });
  }

  return {
    code: result.code,
    data: result.data,
    frontmatter: result.frontmatter,
  };
}

/** Emits the exports declared via {@link ExtraPluginHooks.collectExports} once
 *  per document, as an ESM node prepended to the tree. */
function exportsPlugin(hooks: ExtraPluginHooks[]): HastPluginDefinition {
  return {
    name: 'fd-exports',
    after(root, ctx) {
      // name -> statement, so a later export of the same name replaces an earlier one
      const statements = new Map<string, string>();
      const addExport = (name: string, valueCode: string) => {
        statements.set(name, `export const ${name} = ${valueCode};`);
      };

      for (const hook of hooks) {
        hook.collectExports?.({ data: ctx.data, addExport });
      }

      const { frontmatter, _valueToExport } = ctx.data;
      if (frontmatter) addExport('frontmatter', JSON.stringify(frontmatter));
      if (Array.isArray(_valueToExport)) {
        for (const name of _valueToExport) {
          if (!(name in ctx.data)) continue;
          addExport(name, JSON.stringify(ctx.data[name as keyof Data]));
        }
      }

      if (statements.size > 0) {
        ctx.prependChild(root, {
          type: 'mdxjsEsm',
          value: Array.from(statements.values()).join('\n'),
        });
      }
    },
  };
}
