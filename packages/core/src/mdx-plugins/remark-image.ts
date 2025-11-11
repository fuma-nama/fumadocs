import * as path from 'node:path';
import type { Image, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import type { ISizeCalculationResult } from 'image-size/types/interface';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { fileURLToPath } from 'node:url';

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
   * @defaultValue 'blur'
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

/**
 * Turn images into Next.js Image compatible usage.
 */
export function remarkImage({
  placeholder = 'blur',
  external = true,
  useImport = true,
  onError = 'error',
  publicDir = path.join(process.cwd(), 'public'),
}: RemarkImageOptions = {}): Transformer<Root, Root> {
  return async (tree, file) => {
    const importsToInject: { variableName: string; importPath: string }[] = [];
    const promises: Promise<void>[] = [];

    async function onImage(
      src: Source,
      node: Image,
    ): Promise<MdxJsxFlowElement | undefined> {
      if (src.type === 'file' && useImport) {
        // Unique variable name for the given static image URL
        const variableName = `__img${importsToInject.length}`;
        const hasBlur =
          placeholder === 'blur' &&
          VALID_BLUR_EXT.some((ext) => src.file.endsWith(ext));

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

        if (hasBlur) {
          out.attributes.push({
            type: 'mdxJsxAttribute',
            name: 'placeholder',
            value: 'blur',
          });
        }

        return out;
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

      return {
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
            // `src` doesn't support file paths, we can use `node.url` for files and let the underlying framework handle it
            value: src.type === 'url' ? src.url.toString() : node.url,
          },
          {
            type: 'mdxJsxAttribute',
            name: 'width',
            value: size.width.toString(),
          },
          {
            type: 'mdxJsxAttribute',
            name: 'height',
            value: size.height.toString(),
          },
        ],
        children: [],
      };
    }

    visit(tree, 'image', (node) => {
      const src = parseSrc(decodeURI(node.url), publicDir, file.dirname);
      if (!src) return;

      const task = onImage(src, node)
        .catch((e) => {
          // ignore SVG as it is not always needed
          if (onError === 'ignore' || node.url.endsWith('.svg')) {
            return;
          }

          if (onError === 'hide') {
            return {
              type: 'mdxJsxFlowElement',
              name: null,
              attributes: [],
              children: [],
            } satisfies MdxJsxFlowElement;
          }

          if (onError === 'error') throw e;
          onError(e);
        })
        .then((res) => {
          if (res) Object.assign(node, res);
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

function getImportPath(file: string, dir: string): string {
  const relative = path.relative(dir, file).replaceAll(path.sep, '/');

  return relative.startsWith('../') ? relative : `./${relative}`;
}

/**
 * @param src - src href
 * @param publicDir - dir/url to resolve absolute paths
 * @param dir - dir to resolve relative paths
 */
function parseSrc(
  src: string,
  publicDir: string,
  dir?: string,
): Source | undefined {
  if (src.startsWith('file:///'))
    return { type: 'file', file: fileURLToPath(src) };

  if (EXTERNAL_URL_REGEX.test(src)) {
    return {
      type: 'url',
      url: new URL(src),
    };
  }

  if (src.startsWith('/')) {
    if (EXTERNAL_URL_REGEX.test(publicDir)) {
      const url = new URL(publicDir);
      const segs = [...url.pathname.split('/'), ...src.split('/')].filter(
        (v) => v.length > 0,
      );

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
): Promise<ISizeCalculationResult | undefined> {
  if (src.type === 'file') {
    const { imageSizeFromFile } = await import('image-size/fromFile');
    return imageSizeFromFile(src.file);
  }
  if (onExternal === false) return;

  const { timeout } = typeof onExternal === 'object' ? onExternal : {};
  const res = await fetch(src.url, {
    signal:
      typeof timeout === 'number' ? AbortSignal.timeout(timeout) : undefined,
  });
  if (!res.ok) {
    throw new Error(
      `[Remark Image] Failed to fetch ${src.url} (${res.status}): ${await res.text()}`,
    );
  }

  const { imageSize } = await import('image-size');
  return imageSize(new Uint8Array(await res.arrayBuffer()));
}
