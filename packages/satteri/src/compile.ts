import '@/data-map';
import { mdxToJs, type MdxCompileOptions, type MdxToJsResult, type Data } from 'satteri';
import { pathToFileURL } from 'node:url';
import { jsxToSource } from './utils';

export interface CompileMdxOptions {
  source: string;
  filePath: string;
  frontmatter?: Record<string, unknown>;
  isDevelopment?: boolean;
  environment?: 'bundler' | 'runtime';
  options: MdxCompileOptions;
}

export type CompileMdxResult = MdxToJsResult;

export interface ExtraPluginHooks {
  beforeToJs?: (opts: { data: Data }) => void;
  afterToJs?: (opts: { result: MdxToJsResult }) => void;
}

export async function compileMdx({
  source,
  filePath,
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

  const result = await mdxToJs(source, {
    ...satteriOptions,
    mdastPlugins,
    hastPlugins,
    development: isDevelopment,
    outputFormat: environment === 'runtime' ? 'function-body' : satteriOptions.outputFormat,
    fileURL: satteriOptions.fileURL ?? pathToFileURL(filePath),
    data,
    features: {
      gfm: true,
      frontmatter: false,
      directive: true,
      ...satteriOptions.features,
    },
  });

  for (const plugin of plugins) {
    plugin.afterToJs?.({ result });
  }

  // var name -> code line
  const injectedExports = new Map<string, string>();
  function queueDataExport(name: string, code: string): void {
    injectedExports.set(name, `export const ${name} = ${code};`);
  }

  const outData = result.data;
  if (outData.frontmatter) {
    queueDataExport('frontmatter', JSON.stringify(outData.frontmatter));
  }
  if (outData.structuredData) {
    queueDataExport('structuredData', JSON.stringify(outData.structuredData));
  }
  if (typeof outData._markdown === 'string') {
    queueDataExport('_markdown', JSON.stringify(outData._markdown));
  }
  if (outData.extractedReferences) {
    queueDataExport('extractedReferences', JSON.stringify(outData.extractedReferences));
  }
  if (Array.isArray(outData._valueToExport)) {
    for (const name of outData._valueToExport) {
      if (typeof name === 'string' && name in outData) {
        queueDataExport(name, JSON.stringify(outData[name]));
      }
    }
  }
  const tocExport = outData._tocEsmExport;
  if (tocExport) {
    queueDataExport(
      tocExport.name,
      `[${tocExport.items
        .map((item) => {
          let obj = '{';
          obj += `title: ${jsxToSource(item.title)},`;
          obj += `url: ${JSON.stringify(item.url)},`;
          obj += `depth: ${JSON.stringify(item.depth)},`;
          if (item._step !== undefined) obj += `_step: ${JSON.stringify(item._step)},`;
          obj += '}';
          return obj;
        })
        .join(',')}]`,
    );
  }

  let code = `${result.code.trimEnd()}\n${Array.from(injectedExports.values()).join('\n')}\n`;
  if (injectedExports.size > 0) {
    code = `${code}\n${Array.from(injectedExports.values()).join('\n')}`;
  }
  if (outData._imageImports?.length) {
    code = `${outData._imageImports.join('\n')}\n${code}`;
  }
  return {
    code,
    data: outData,
    frontmatter: result.frontmatter,
  };
}
