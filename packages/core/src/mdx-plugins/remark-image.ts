import * as path from 'node:path';
import type { Image, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { imageSize } from 'image-size';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import { joinPath, slash } from '@/utils/path';
import type { ISizeCalculationResult } from 'image-size/types/interface';
import { imageSizeFromFile } from 'image-size/fromFile';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { fileURLToPath } from 'node:url';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;

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
  external?: boolean;
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
      if ((src.type === 'url' && external) || !useImport) {
        const size = await getImageSize(src).catch((e) => {
          throw new Error(
            `[Remark Image] Failed obtain image size for ${node.url} (public directory configured as ${publicDir})`,
            {
              cause: e,
            },
          );
        });

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

      if (src.type === 'file') {
        // Unique variable name for the given static image URL
        const variableName = `__img${importsToInject.length}`;
        const hasBlur =
          placeholder === 'blur' &&
          VALID_BLUR_EXT.some((ext) => src.file.endsWith(ext));

        importsToInject.push({
          variableName,
          importPath: file.dirname
            ? getImportPath(src.file, file.dirname)
            : node.url,
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
    }

    visit(tree, 'image', (node) => {
      const src = parseSrc(decodeURI(node.url), publicDir);

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
  const relative = slash(path.relative(dir, file));

  return relative.startsWith('../') ? relative : `./${relative}`;
}

function parseSrc(src: string, dir: string): Source {
  if (src.startsWith('file:///'))
    return { type: 'file', file: fileURLToPath(src) };

  if (EXTERNAL_URL_REGEX.test(src)) {
    return {
      type: 'url',
      url: new URL(src),
    };
  }

  if (EXTERNAL_URL_REGEX.test(dir)) {
    const url = new URL(dir);
    url.pathname = joinPath(url.pathname, src);
    return { type: 'url', url };
  }

  return { type: 'file', file: path.resolve(dir, src) };
}

async function getImageSize(src: Source): Promise<ISizeCalculationResult> {
  if (src.type === 'file') return imageSizeFromFile(src.file);

  const res = await fetch(src.url);
  if (!res.ok) {
    throw new Error(
      `[Remark Image] Failed to fetch ${src.url} (${res.status}): ${await res.text()}`,
    );
  }

  return imageSize(new Uint8Array(await res.arrayBuffer()));
}
