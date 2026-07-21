import {
  mdxToJs,
  type HastPluginInput,
  type MdxCompileOptions,
  type MdxToJsResult,
  type Data,
} from 'satteri';
import { pathToFileURL } from 'node:url';

/**
 * Appended to every document so plugins have a node that always exists and is
 * always visited last. An MDX comment, not a JSX element, so it emits nothing
 * even if a plugin leaves it in place.
 */
export const EXPORT_ANCHOR_ID = 'fd-exports-anchor';
const EXPORT_ANCHOR = `{/*${EXPORT_ANCHOR_ID}*/}`;

export function isExportAnchor(node: { type: string; value?: unknown }): boolean {
  return (
    (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') &&
    typeof node.value === 'string' &&
    node.value.includes(EXPORT_ANCHOR_ID)
  );
}

export interface CompileMdxOptions {
  source: string;
  filePath: string;
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

function exportAnchorPlugin(plugins: ExtraPluginHooks[]): HastPluginInput {
  return () => ({
    name: 'fd-export-anchor',
    mdxFlowExpression(node, ctx) {
      if (!isExportAnchor(node)) return;

      // name -> statement, so a later export of the same name replaces an earlier one
      const statements = new Map<string, string>();
      const addExport = (name: string, valueCode: string) => {
        statements.set(name, `export const ${name} = ${valueCode};`);
      };

      for (const plugin of plugins) {
        plugin.collectExports?.({ data: ctx.data, addExport });
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
        let root = ctx.parent(node);
        while (root) {
          const next = ctx.parent(root);
          if (!next) break;
          root = next;
        }

        if (root) {
          ctx.prependChild(root, {
            type: 'mdxjsEsm',
            value: Array.from(statements.values()).join('\n'),
          });
        }
      }

      ctx.removeNode(node);
    },
  });
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

  const outputFormat: OutputFormat =
    environment === 'runtime' ? 'function-body' : (satteriOptions.outputFormat ?? 'program');

  const result = await mdxToJs(`${source}\n\n${EXPORT_ANCHOR}\n`, {
    ...satteriOptions,
    mdastPlugins,
    // appended last so it runs after the plugins whose exports it collects
    hastPlugins: [...hastPlugins, exportAnchorPlugin(plugins)],
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
  });

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
