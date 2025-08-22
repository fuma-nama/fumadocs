import Slugger from 'github-slugger';
import type { Root, PhrasingContent, Text } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';

export interface RemarkWikilinkOptions {
  /**
   * File extension to append when a wikilink does not specify one
   * @defaultValue 'mdx'
   */
  baseExtension?: 'md' | 'mdx';

  /**
   * Slugify page/path segments derived from a wikilink
   * @defaultValue lower-case + replace spaces with '-'
   */
  slugify?: (segment: string) => string;

  /**
   * Optional key->href map for resolving bare keys (e.g. [[Breadcrumb]]) to URLs.
   * If provided, values should be full hrefs (e.g. '/docs/headless/components/breadcrumb').
   */
  keyLinkMap?: Record<string, string>;
}

const imageExtRegex = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const hasExtRegex = /\.[a-zA-Z0-9]+$/;
const isUrlRegex = /^(https?:)?\/\//i;

/**
 * Convert Obsidian-style wikilinks into normal links/images.
 * Supports:
 *  - [[target]]
 *  - [[target|alias]]
 *  - [[target#heading]]
 *  - [[target#heading|alias]]
 *  - ![[image.png]] (and with alias)
 */
export function remarkWikilink({
  baseExtension = 'mdx',
  slugify = defaultSlugify,
  keyLinkMap,
}: RemarkWikilinkOptions = {}): Transformer<Root, Root> {
  const slugger = new Slugger();
  const normalizedKeyMap = normalizeKeyMap(keyLinkMap, slugify);

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      // Do not transform inside code or links/images
      const p = parent as { type: string };
      if (
        p.type === 'link' ||
        p.type === 'image' ||
        p.type === 'inlineCode' ||
        p.type === 'code'
      )
        return;

      const parts = transformTextToNodes(node, {
        baseExtension,
        slugify,
        slugger,
        keyLinkMap: normalizedKeyMap,
      });
      if (!parts) return;

      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}

function transformTextToNodes(
  node: Text,
  options: {
    baseExtension: 'md' | 'mdx';
    slugify: (segment: string) => string;
    slugger: Slugger;
    keyLinkMap?: Record<string, string>;
  },
): PhrasingContent[] | undefined {
  const value = node.value;
  if (!value || !value.includes('[[')) return;

  const out: PhrasingContent[] = [];
  const re =
    /(!)?\[\[([^\]|#]+(?:\/[\w\s\-().]+)*)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  for (;;) {
    const match = re.exec(value);
    if (!match) break;
    const [full, bang, rawTarget = '', rawHeading, rawAlias] = match;
    if (match.index > lastIndex) {
      out.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }

    const isImage = Boolean(bang);
    const alias = rawAlias?.trim();
    const heading = rawHeading?.trim();

    let target = rawTarget.trim();
    // If target is empty (edge-case), keep original text
    if (!target) {
      out.push({ type: 'text', value: full });
      lastIndex = re.lastIndex;
      continue;
    }

    // Normalize segments (slugify when no explicit extension)
    const targetHasExt = hasExtRegex.test(target);
    const segments = target.split('/').map((seg, i, arr) => {
      // If last segment has extension, keep as-is
      if (i === arr.length - 1 && targetHasExt) return seg;
      return options.slugify(seg);
    });
    target = segments.join('/');

    const likelyImage = isImage || imageExtRegex.test(target);

    if (likelyImage) {
      let url = target;
      if (
        !isUrlRegex.test(url) &&
        !url.startsWith('.') &&
        !url.startsWith('/')
      ) {
        url = `./${url}`;
      }

      out.push({
        type: 'image',
        url,
        alt: alias ?? 'image',
      });
    } else {
      // Try key map for single-key wikilinks (no slash and no extension)
      if (!targetHasExt && !target.includes('/') && options.keyLinkMap) {
        const mapped =
          options.keyLinkMap[target] ??
          options.keyLinkMap[target.toLowerCase()];
        if (mapped) {
          // remove .md/.mdx from mapped if present
          let href = mapped.replace(/\.(md|mdx)$/i, '');
          if (heading && heading.length > 0)
            href += `#${options.slugger.slug(heading)}`;

          out.push({
            type: 'link',
            url: href,
            title: null,
            children: [
              {
                type: 'text',
                value: alias ?? renderTitleFromTarget(rawTarget),
              },
            ],
          });

          lastIndex = re.lastIndex;
          continue;
        }
      }

      // If target explicitly ends with .md/.mdx, strip the extension
      if (/\.(md|mdx)$/i.test(target)) {
        target = target.replace(/\.(md|mdx)$/i, '');
      }
      // Append extension if missing is intentionally skipped to keep clean URLs

      let href = target;
      if (heading && heading.length > 0) {
        href += `#${options.slugger.slug(heading)}`;
      }

      if (
        !isUrlRegex.test(href) &&
        !href.startsWith('.') &&
        !href.startsWith('/')
      ) {
        href = `./${href}`;
      }

      out.push({
        type: 'link',
        url: href,
        title: null,
        children: [
          {
            type: 'text',
            value: alias ?? renderTitleFromTarget(rawTarget),
          },
        ],
      });
    }

    lastIndex = re.lastIndex;
  }

  if (out.length === 0) return;
  if (lastIndex < value.length)
    out.push({ type: 'text', value: value.slice(lastIndex) });
  return out;
}

function defaultSlugify(segment: string): string {
  return segment
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-().]/g, '')
    .toLowerCase();
}

function renderTitleFromTarget(target: string): string {
  const last = target.split('/').pop() ?? target;
  const name = last.replace(hasExtRegex, '');
  return name;
}

function normalizeKeyMap(
  keyLinkMap: Record<string, string> | undefined,
  slugify: (segment: string) => string,
): Record<string, string> | undefined {
  if (!keyLinkMap) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(keyLinkMap)) {
    out[k] = v;
    out[k.toLowerCase()] = v;
    const s = slugify(k);
    out[s] = v;
    out[s.toLowerCase()] = v;
  }
  return out;
}
