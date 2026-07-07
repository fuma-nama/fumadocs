import { mdxToJs, type MdxCompileOptions, type MdxToJsResult, type Data } from 'satteri';
import { pathToFileURL } from 'node:url';

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
  if (Array.isArray(outData._valueToExport)) {
    for (const name of outData._valueToExport) {
      if (!(name in outData)) continue;
      queueDataExport(name, JSON.stringify(outData[name]));
    }
  }

  let code = result.code;
  if (injectedExports.size > 0) {
    code = `${code}\n${Array.from(injectedExports.values()).join('\n')}`;
  }
  return {
    code,
    data: outData,
    frontmatter: result.frontmatter,
  };
}
