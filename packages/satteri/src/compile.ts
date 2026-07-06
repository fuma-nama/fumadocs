import '@/data-map';
import { mdxToJs, type MdxCompileOptions, MdxToJsResult } from 'satteri';
import { pathToFileURL } from 'node:url';
import { appendExports, queueDataExport, queueTocJsxExport } from '@/inject-exports';

export interface CompileMdxOptions {
  source: string;
  filePath: string;
  frontmatter?: Record<string, unknown>;
  isDevelopment?: boolean;
  environment?: 'bundler' | 'runtime';
  options: MdxCompileOptions;
}

export type CompileMdxResult = MdxToJsResult;

export async function compileMdx({
  source,
  filePath,
  frontmatter,
  isDevelopment = false,
  environment = 'bundler',
  options,
}: CompileMdxOptions): Promise<CompileMdxResult> {
  const data: NonNullable<MdxCompileOptions['data']> = { ...options.data };
  if (frontmatter) data.frontmatter = frontmatter;

  const result = await mdxToJs(source, {
    ...options,
    // force the result type to be async
    mdastPlugins: options.mdastPlugins ?? [],
    development: isDevelopment,
    outputFormat: environment === 'runtime' ? 'function-body' : options.outputFormat,
    fileURL: options.fileURL ?? pathToFileURL(filePath),
    data,
    features: {
      gfm: true,
      frontmatter: false,
      directive: true,
      ...options.features,
    },
  });

  const outData = result.data as typeof data;
  if (outData.frontmatter) {
    queueDataExport(outData, 'frontmatter', outData.frontmatter);
  }
  if (outData.structuredData) {
    queueDataExport(outData, 'structuredData', outData.structuredData);
  } else {
    // remark-structure only assigns `structuredData` from node visitors, so a
    // page without any matching nodes would otherwise miss the export and
    // break consumers that expect it on every page (e.g. search indexing)
    outData.structuredData = { contents: [], headings: [] };
    queueDataExport(outData, 'structuredData', outData.structuredData);
  }
  if (typeof outData._markdown === 'string') {
    queueDataExport(outData, '_markdown', outData._markdown);
  }
  if (outData.extractedReferences) {
    queueDataExport(outData, 'extractedReferences', outData.extractedReferences);
  }
  if (Array.isArray(outData._valueToExport)) {
    for (const name of outData._valueToExport) {
      if (typeof name === 'string' && name in outData) {
        queueDataExport(outData, name, outData[name]);
      }
    }
  }
  const tocExport = outData._tocEsmExport;
  if (tocExport) {
    queueTocJsxExport(outData, tocExport.name, tocExport.items);
  }

  let code = appendExports(result.code, outData);

  const imports = outData._imageImports;
  if (imports?.length) {
    const importCode = imports
      .map((node) => {
        const estree = (node as { data?: { estree?: { body: unknown[] } } }).data?.estree;
        if (!estree) return '';
        const decl = estree.body[0] as {
          type: string;
          source: { value: string };
          specifiers: { local: { name: string } }[];
        };
        if (decl.type !== 'ImportDeclaration') return '';
        const specifier = decl.specifiers[0];
        if (!specifier) return '';
        return `import ${specifier.local.name} from ${JSON.stringify(decl.source.value)};`;
      })
      .filter(Boolean)
      .join('\n');
    code = `${importCode}\n${code}`;
  }

  return {
    code,
    data: outData,
    frontmatter: result.frontmatter,
  };
}
