import type {
  Data,
  HastNode,
  HastPluginDefinition,
  HastPluginInput,
  HastVisitorContext,
} from 'satteri';
import type { ExtraPluginHooks } from './compile';

export type DocumentFormat = 'md' | 'mdx';

export const EXPORT_ANCHOR_ID = 'fd-exports-anchor';

/** MDX keeps its node type across mdast and hast, the HTML comment is `html` then `raw`. */
const ANCHOR_NODE_TYPES = new Set(['mdxFlowExpression', 'mdxTextExpression', 'html', 'raw']);

/** Format-agnostic, so plugins that never learn the format can still skip the anchor. */
export function isExportAnchor(node: { type: string; value?: unknown }): boolean {
  return (
    ANCHOR_NODE_TYPES.has(node.type) &&
    typeof node.value === 'string' &&
    node.value.includes(EXPORT_ANCHOR_ID)
  );
}

interface AnchorSyntax {
  /** must survive the format's parser as a single node */
  marker: string;
  visitorKey: 'mdxFlowExpression' | 'raw';
}

const SYNTAX: Record<DocumentFormat, AnchorSyntax> = {
  mdx: {
    marker: `{/*${EXPORT_ANCHOR_ID}*/}`,
    visitorKey: 'mdxFlowExpression',
  },
  // CommonMark has no expression syntax, and the MDX marker would parse as
  // `{/` + emphasis + `/}`. An HTML comment renders nothing either way.
  md: {
    marker: `<!--${EXPORT_ANCHOR_ID}-->`,
    visitorKey: 'raw',
  },
};

type AnchorNode = Extract<HastNode, { type: 'raw' | 'mdxFlowExpression' }>;

function collectExportsAt(
  node: Readonly<AnchorNode>,
  ctx: HastVisitorContext,
  hooks: ExtraPluginHooks[],
): void {
  if (!isExportAnchor(node)) return;

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
}

/**
 * A node appended to every document so plugins have somewhere to declare exports
 * from that always exists and is always visited last. The marker and the node
 * type it parses to differ per format.
 */
export interface ExportAnchor {
  readonly format: DocumentFormat;
  append(source: string): string;
  plugin(hooks: ExtraPluginHooks[]): HastPluginInput;
}

export function createExportAnchor(format: DocumentFormat): ExportAnchor {
  const { marker, visitorKey } = SYNTAX[format];

  return {
    format,
    append: (source) => `${source}\n\n${marker}\n`,
    plugin: (hooks) => () =>
      ({
        name: 'fd-export-anchor',
        [visitorKey]: (node: Readonly<AnchorNode>, ctx: HastVisitorContext) =>
          collectExportsAt(node, ctx, hooks),
      }) as HastPluginDefinition,
  };
}
