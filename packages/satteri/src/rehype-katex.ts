import { defineHastPlugin, type HastPluginDefinition, type HastVisitorContext } from 'satteri';
import type { Element, ElementContent } from 'hast';
import type { KatexOptions } from 'katex';

export type RehypeKatexOptions = Omit<KatexOptions, 'displayMode' | 'throwOnError'>;

// Lazy-loaded so configs without math never pull katex (or an HTML parser) in,
// and so rendering uses the consumer's own katex — the one whose stylesheet they
// import, keeping markup and CSS in lockstep.
let depsPromise:
  | Promise<{
      renderToString: typeof import('katex').default.renderToString;
      fromHtml: typeof import('hast-util-from-html').fromHtml;
    }>
  | undefined;

function loadDeps() {
  depsPromise ??= Promise.all([import('katex'), import('hast-util-from-html')]).then(
    ([katex, hast]) => ({ renderToString: katex.default.renderToString, fromHtml: hast.fromHtml }),
  );
  return depsPromise;
}

function classList(node: Element): string[] {
  const raw: unknown = node.properties?.className;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') return raw.split(/\s+/);
  return [];
}

function replace(
  target: Element,
  nodes: ElementContent[],
  ctx: Pick<HastVisitorContext, 'replaceNode' | 'insertAfter' | 'removeNode'>,
) {
  if (nodes.length === 0) {
    ctx.removeNode(target);
    return;
  }
  ctx.replaceNode(target, nodes[0]);
  if (nodes.length > 1) ctx.insertAfter(target, nodes.slice(1));
}

/**
 * Render `$…$`, `$$…$$`, and ```` ```math ```` blocks to KaTeX markup — the
 * Satteri counterpart of `rehype-katex`. Satteri's `math` feature parses the
 * syntax into `<code class="language-math …">` elements (raw TeX); this renders
 * them.
 *
 * The preset adds this to the hast pipeline when `math` is enabled.
 */
export function rehypeKatex(options: RehypeKatexOptions = {}) {
  return (): HastPluginDefinition =>
    defineHastPlugin({
      name: 'rehype-katex',
      element: {
        filter: ['code'],
        async visit(node, ctx) {
          const classes = classList(node);
          if (!classes.includes('language-math')) return;

          const displayMode = !classes.includes('math-inline');
          const { renderToString, fromHtml } = await loadDeps();
          // render broken formulas in place instead of failing the whole compile
          const html = renderToString(ctx.textContent(node), {
            ...options,
            displayMode,
            throwOnError: false,
          });
          const rendered = fromHtml(html, { fragment: true }).children as ElementContent[];

          const parent = ctx.parent(node);
          const target =
            displayMode && parent?.type === 'element' && parent.tagName === 'pre' ? parent : node;
          replace(target, rendered, ctx);
        },
      },
    });
}
