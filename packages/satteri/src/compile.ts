import {
  mdxToJs,
  type HastPluginInput,
  type MdxCompileOptions,
  type MdxToJsResult,
  type Data,
} from 'satteri';
import { pathToFileURL } from 'node:url';

/**
 * Marker appended to every compiled document, giving plugins a node that is
 * guaranteed to exist and to be visited last.
 *
 * An MDX comment expression is used rather than a JSX element because the
 * compiler emits nothing for it, so it cannot show up in the output if a plugin
 * ever leaves it in place.
 */
export const EXPORT_ANCHOR_ID = 'fd-exports-anchor';
const EXPORT_ANCHOR = `{/*${EXPORT_ANCHOR_ID}*/}`;

/** whether an mdast/hast node is the anchor appended by {@link compileMdx} */
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
  /** declare `export const <name> = <valueCode>`; a repeated name replaces the earlier one */
  addExport: (name: string, valueCode: string) => void;
}

export interface ExtraPluginHooks {
  beforeToJs?: (opts: { data: Data }) => void;
  /**
   * Declare the module exports this plugin contributes.
   *
   * Runs once per compile, at the anchor appended to the end of the document,
   * so every visitor has already seen the content and anything accumulated on
   * `data` is final. The exports are injected into the tree as a single ESM
   * node, which means the compiler emits them the right way for whichever
   * output format is in use — as real `export const` statements for
   * `'program'`, and as members of the returned object for `'function-body'`.
   */
  collectExports?: (opts: CollectExportsContext) => void;
  /** post-process the generated code; use {@link collectExports} for exports */
  afterToJs?: (opts: AfterToJsContext) => void;
}

/**
 * Built-in hast plugin that turns the anchor into the document's ESM exports.
 *
 * It is registered last so the other plugins have been constructed, and the
 * anchor sits at the end of the document so it is visited after their content.
 */
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
