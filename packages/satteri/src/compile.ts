import { mdxToJs, type MdxCompileOptions, type MdxToJsResult, type Data } from 'satteri';
import { pathToFileURL } from 'node:url';
import { createExportAnchor, type DocumentFormat } from './export-anchor';
import { markdownToJs, rehypeDropRawHtml } from './markdown-to-js';

export type { DocumentFormat } from './export-anchor';

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
  beforeToJs?: (opts: { data: Data }) => void;
  /**
   * Declare module exports. Runs at the anchor, after every visitor has seen
   * the document, so `data` is final. Exports go into the tree as an ESM node,
   * so the compiler emits them correctly for either output format.
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

  for (const plugin of plugins) {
    plugin.beforeToJs?.({ data });
  }

  const outputFormat: OutputFormat =
    environment === 'runtime' ? 'function-body' : (satteriOptions.outputFormat ?? 'program');

  const anchor = createExportAnchor(format);
  const compileOptions: MdxCompileOptions = {
    ...satteriOptions,
    mdastPlugins,
    // ordered last so the anchor runs after the plugins whose exports it
    // collects, and the raw drop after the anchor node is gone
    hastPlugins: [
      ...hastPlugins,
      anchor.plugin(plugins),
      ...(format === 'md' ? [rehypeDropRawHtml()] : []),
    ],
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

  const withAnchor = anchor.append(source);
  const result = await (format === 'md'
    ? markdownToJs(withAnchor, compileOptions)
    : mdxToJs(withAnchor, compileOptions));

  for (const plugin of plugins) {
    plugin.afterToJs?.({ result, outputFormat });
  }

  const outData = result.data;
  const code = result.code;
  return {
    code,
    data: outData,
    frontmatter: result.frontmatter,
  };
}
