import * as path from 'node:path';
import type { Image, Nodes, Root } from 'mdast';
import type { Transformer } from 'unified';
import type { Expression } from 'estree-jsx';
import type { MdxJsxFlowElement, MdxjsEsm } from 'mdast-util-mdx';
import { fileURLToPath } from 'node:url';
import { replaceSource } from './stringifier';
import { walk } from './utils';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;

type ExternalImageOptions =
  | {
      /**
       * timeout for fetching remote images (in milliseconds)
       */
      timeout?: number;
    }
  | boolean;

export interface RemarkImageOptions {
  /**
   * Directory or base URL to resolve absolute image paths
   */
  publicDir?: string;

  /**
   * Preferred placeholder type, only available with `useImport` + local images.
   *
   * @defaultValue 'none'
   */
  placeholder?: 'blur' | 'none';

  /**
   * Define how to handle errors when fetching image size.
   *
   * - `error` (default): throw an error.
   * - `ignore`: do absolutely nothing (Next.js Image component may complain).
   * - `hide`: remove that image element.
   *
   * @defaultValue 'error'
   */
  onError?: 'error' | 'hide' | 'ignore' | ((error: Error) => void);

  /**
   * Import images in the file, and let bundlers handle it.
   *
   * ```tsx
   * import MyImage from "./public/img.png";
   *
   * <img src={MyImage} />
   * ```
   *
   * When disabled, `placeholder` will be ignored.
   *
   * @defaultValue true
   */
  useImport?: boolean;

  /**
   * Fetch image size of external URLs
   *
   * @defaultValue true
   */
  external?: ExternalImageOptions;
}

type Source =
  | {
      type: 'url';
      url: URL;
    }
  | {
      type: 'file';
      file: string;
    };

interface ImageSize {
  width: number;
  height: number;
}

/**
 * Turn images into Next.js Image compatible usage.
 */
export function remarkImage({
  placeholder = 'none',
  external = true,
  useImport = true,
  onError = 'error',
  publicDir = path.join(process.cwd(), 'public'),
}: RemarkImageOptions = {}): Transformer<Root, Root> {
  return async (tree, file) => {
    const importsToInject: { variableName: string; importPath: string }[] = [];
    const promises: Promise<void>[] = [];

    async function updateImage(src: Source, node: Image): Promise<void> {
      if (src.type === 'file' && useImport) {
        // Unique variable name for the given static image URL
        const variableName = `__img${importsToInject.length}`;
        const hasBlur =
          placeholder === 'blur' && VALID_BLUR_EXT.some((ext) => src.file.endsWith(ext));

        if (!file.dirname) {
          throw new Error(
            'When `useImport` is enabled, you must specify `dirname` in the VFile passed to compiler.',
          );
        }

        importsToInject.push({
          variableName,
          importPath: getImportPath(src.file, file.dirname),
        });

        const out: MdxJsxFlowElement = {
          children: [],
          type: 'mdxJsxFlowElement',
          name: 'img',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'alt',
              value: node.alt ?? 'image',
            },
            {
              type: 'mdxJsxAttribute',
              name: 'src',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: variableName,
                data: {
                  estree: {
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: { type: 'Identifier', name: variableName },
                      },
                    ],
                    type: 'Program',
                    sourceType: 'script',
                  },
                },
              },
            },
          ],
        };

        if (node.title) {
          out.attributes.push({
            type: 'mdxJsxAttribute',
            name: 'title',
            value: node.title,
          });
        }

        if (hasBlur) {
          out.attributes.push({
            type: 'mdxJsxAttribute',
            name: 'placeholder',
            value: 'blur',
          });
        }

        const { url, alt, title } = node;
        // bundlers serve page-relative images at their own URLs, which the imports resolve to
        if (!url.startsWith('/')) {
          const markdown = `![${(alt ?? '').replace(/[\\[\]]/g, '\\$&')}](`;
          const end = title ? ` "${title.replace(/["\\]/g, '\\$&')}")` : ')';
          replaceSource(
            file,
            node,
            (s) => markdown + s.expression(importedUrl(variableName), url) + end,
          );
        }

        // in place, so stringifiers find its source in included content too
        delete (node as Partial<Image>).url;
        delete node.alt;
        delete node.title;
        Object.assign(node, out);
        return;
      }

      const size = await getImageSize(src, external).catch((e) => {
        throw new Error(
          `[Remark Image] Failed obtain image size for ${node.url} (public directory configured as ${publicDir})`,
          {
            cause: e,
          },
        );
      });

      if (!size) return;
      node.data ??= {};
      node.data.hProperties ??= {};
      // `src` doesn't support file paths, we can use `node.url` for files and let the underlying framework handle it
      node.data.hProperties.src = src.type === 'url' ? src.url.href : node.url;
      node.data.hProperties.width = size.width.toString();
      node.data.hProperties.height = size.height.toString();
    }

    walk<Nodes>(tree, (node, _, parent) => {
      if (node.type !== 'image' || !parent) return;
      const src = parseSrc(decodeURI(node.url), publicDir, file.dirname);
      if (!src) return;

      const task = updateImage(src, node).catch((e) => {
        // ignore SVG as it is not always needed
        if (onError === 'ignore' || node.url.endsWith('.svg')) {
          return;
        }

        if (onError === 'hide') {
          replaceSource(file, node, '');
          parent.children.splice(parent.children.indexOf(node), 1);
          return;
        }

        if (onError === 'error') throw e;
        onError(e);
      });

      promises.push(task);
    });

    await Promise.all(promises);
    if (importsToInject.length === 0) return;

    const imports = importsToInject.map(
      ({ variableName, importPath }) =>
        ({
          type: 'mdxjsEsm',
          data: {
            estree: {
              body: [
                {
                  type: 'ImportDeclaration',
                  source: { type: 'Literal', value: importPath },
                  specifiers: [
                    {
                      type: 'ImportDefaultSpecifier',
                      local: { type: 'Identifier', name: variableName },
                    },
                  ],
                },
              ],
            },
          },
        }) as MdxjsEsm,
    );

    tree.children.unshift(...imports);
  };
}

/** the URL of an imported image, like a string with Vite, or `StaticImageData` with Next.js */
function importedUrl(name: string): Expression {
  return {
    type: 'LogicalExpression',
    operator: '??',
    left: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name },
      property: { type: 'Identifier', name: 'src' },
      computed: false,
      optional: false,
    },
    right: { type: 'Identifier', name },
  };
}

function getImportPath(file: string, dir: string): string {
  const relative = path.relative(dir, file);
  const posix = relative.replaceAll(path.sep, '/');
  // across Windows drives, `path.relative()` returns an absolute path
  if (path.isAbsolute(relative) || posix.startsWith('../')) return posix;

  return `./${posix}`;
}

/**
 * @param src - src href
 * @param publicDir - dir/url to resolve absolute paths
 * @param dir - dir to resolve relative paths
 */
function parseSrc(src: string, publicDir: string, dir?: string): Source | undefined {
  if (src.startsWith('file:///')) return { type: 'file', file: fileURLToPath(src) };

  if (EXTERNAL_URL_REGEX.test(src)) {
    return {
      type: 'url',
      url: new URL(src),
    };
  }

  if (src.startsWith('/')) {
    if (EXTERNAL_URL_REGEX.test(publicDir)) {
      const url = new URL(publicDir);
      const segs = [...url.pathname.split('/'), ...src.split('/')].filter((v) => v.length > 0);

      url.pathname = `/${segs.join('/')}`;
      return { type: 'url', url };
    }

    return {
      type: 'file',
      file: path.join(publicDir, src),
    };
  }

  if (!dir) {
    console.warn(
      `[Remark Image] found relative path ${src} but missing 'dirname' in VFile, this image will be skipped for now.`,
    );
    return;
  }

  return {
    type: 'file',
    file: path.join(dir, src),
  };
}

async function getImageSize(
  src: Source,
  onExternal: ExternalImageOptions,
): Promise<ImageSize | undefined> {
  const { probe } = await import('@fumari/image-size');

  if (src.type === 'file') return probe(src.file);
  if (onExternal === false) return;

  // reading stops as soon as the image header has been parsed
  const { timeout } = typeof onExternal === 'object' ? onExternal : {};
  return probe(src.url, { timeout });
}
