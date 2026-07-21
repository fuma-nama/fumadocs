import {
  applyCommandsToMdastHandle,
  compileHandle,
  convertMdastToHastHandle,
  createMdastHandle,
  dropHandle,
  getHandleSource,
  resolveHastSubscriptions,
  resolveMdastSubscriptions,
  visitHastHandle,
  visitMdastHandle,
  type Data,
  type Features,
  type HastPluginDefinition,
  type HastPluginInput,
  type MdastPluginDefinition,
  type MdxCompileOptions,
  type MdxToJsResult,
} from 'satteri';
import { isExportAnchor } from './export-anchor';

/**
 * Satteri 0.9.5 compiles to JavaScript only through `mdxToJs`, which has no
 * `format` option. Its `mdxToJs` and `markdownToHtml` are one pipeline differing
 * in the parser, the `sourceFormat` given to plugins, and whether the hast handle
 * is compiled or rendered, and every step between is public API, so the missing
 * combination is assembled here. Drop this once upstream exposes it.
 *
 * Two internals are unavailable:
 * - `markHandleMutated`, so a child stub retained across a mutation reads freed
 *   arena memory instead of throwing satteri's retention error.
 * - `getMdastFrontmatter`, so `frontmatter` is always `null`. `compileMdx` sets
 *   `features.frontmatter: false`, so there is nothing to return anyway.
 */
export async function markdownToJs(
  source: string,
  options: MdxCompileOptions = {},
): Promise<MdxToJsResult> {
  const {
    mdastPlugins = [],
    hastPlugins = [],
    features,
    fileURL,
    data = {},
    ...mdxOptions
  } = options;
  const { features: nativeFeatures, convertOptions } = featuresToNative(features);

  const hastHandle = await runMdastPhase(source, mdastPlugins, fileURL, data, {
    features: nativeFeatures,
    convertOptions,
  });

  try {
    for (const input of hastPlugins) {
      const plugin = (typeof input === 'function' ? input() : input) as HastPluginDefinition;
      const dropped = await visitHastHandle(
        hastHandle,
        plugin,
        resolveHastSubscriptions(plugin),
        source,
        fileURL,
        data,
        'markdown',
      );

      if (dropped) warnDropped(plugin.name, dropped, 'hast');
    }

    return {
      code: compileHandle(hastHandle, mdxOptions),
      frontmatter: null,
      data,
    };
  } finally {
    dropHandle(hastHandle);
  }
}

/** The conversion empties the mdast arena, but it still leaks if a step before it throws. */
async function runMdastPhase(
  source: string,
  plugins: NonNullable<MdxCompileOptions['mdastPlugins']>,
  fileURL: URL | undefined,
  data: Data,
  native: {
    features: Record<string, unknown> | undefined;
    convertOptions: Record<string, unknown> | undefined;
  },
) {
  const handle = createMdastHandle(source, native.features);

  try {
    for (const input of plugins) {
      const plugin = (typeof input === 'function' ? input() : input) as MdastPluginDefinition;
      const result = await visitMdastHandle(
        handle,
        plugin,
        resolveMdastSubscriptions(plugin),
        () => getHandleSource(handle),
        fileURL,
        data,
        'markdown',
      );

      if (result.hasMutations) {
        const dropped = applyCommandsToMdastHandle(handle, result.commandBuffer);
        if (dropped) warnDropped(plugin.name, dropped, 'mdast');
      }
    }

    return convertMdastToHastHandle(handle, native.convertOptions);
  } finally {
    dropHandle(handle);
  }
}

/**
 * JSX cannot express a `raw` node, so the compiler emits it as a string literal
 * and `line<br>break` renders as visible markup. Dropping matches
 * `@fumadocs/local-md`, whose `remark-rehype` defaults to
 * `allowDangerousHtml: false`. `dangerouslySetInnerHTML` is not an option: an
 * element split across block boundaries arrives as separate open and close nodes.
 */
export function rehypeDropRawHtml(): HastPluginInput {
  return () => ({
    name: 'fd-drop-raw-html',
    raw(node, ctx) {
      // the anchor is a raw node too, removed by its own plugin
      if (isExportAnchor(node)) return;
      ctx.removeNode(node);
    },
  });
}

/** Mirrors satteri's own warning. */
function warnDropped(name: string | undefined, dropped: number, kind: 'mdast' | 'hast'): void {
  const noun = dropped === 1 ? 'transform' : 'transforms';
  console.warn(
    `satteri: plugin "${name ?? '<anonymous>'}" queued ${dropped} ${kind} ${noun} on node(s) ` +
      `that were removed or replaced earlier in the same pass; ` +
      `${dropped === 1 ? 'it was' : 'they were'} dropped.`,
  );
}

/** Port of satteri's internal `featuresToNative`, keep in step with it. */
function featuresToNative(features: Features | undefined): {
  features: Record<string, unknown> | undefined;
  convertOptions: Record<string, unknown> | undefined;
} {
  if (!features) return { features: undefined, convertOptions: undefined };

  const result: Record<string, unknown> = {};
  let convertOptions: Record<string, unknown> | undefined;

  if (features.gfm !== undefined) {
    if (typeof features.gfm === 'object') {
      const gfmOptions: Record<string, unknown> = {};
      const { footnotes } = features.gfm;

      if (footnotes !== undefined) {
        if (typeof footnotes === 'object') {
          gfmOptions.footnotes = true;
          convertOptions = {};
          if (footnotes.label !== undefined) convertOptions.footnoteLabel = footnotes.label;
          if (footnotes.backContent !== undefined)
            convertOptions.footnoteBackContent = footnotes.backContent;
          if (footnotes.backLabel !== undefined)
            convertOptions.footnoteBackLabel = footnotes.backLabel;
        } else {
          gfmOptions.footnotes = footnotes;
        }
      }

      result.gfmOptions = gfmOptions;
    } else {
      result.gfm = features.gfm;
    }
  }

  if (features.frontmatter !== undefined) result.frontmatter = features.frontmatter;

  if (features.math !== undefined) {
    if (typeof features.math === 'object') {
      result.mathOptions =
        features.math.singleDollarTextMath !== undefined
          ? { singleDollarTextMath: features.math.singleDollarTextMath }
          : {};
    } else {
      result.math = features.math;
    }
  }

  if (features.headingAttributes !== undefined)
    result.headingAttributes = features.headingAttributes;
  if (features.directive !== undefined) result.directive = features.directive;
  if (features.superscript !== undefined) result.superscript = features.superscript;
  if (features.subscript !== undefined) result.subscript = features.subscript;
  if (features.wikilinks !== undefined) result.wikilinks = features.wikilinks;

  if (features.smartPunctuation !== undefined) {
    if (typeof features.smartPunctuation === 'object') {
      result.smartPunctuationOptions = features.smartPunctuation;
    } else {
      result.smartPunctuation = features.smartPunctuation;
    }
  }

  return { features: result, convertOptions };
}
