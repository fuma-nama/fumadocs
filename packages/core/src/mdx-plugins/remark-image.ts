import * as path from 'node:path';
import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { imageSize } from 'image-size';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import { resolvePath, slash } from '@/utils/path';
import type { ISizeCalculationResult } from 'image-size/types/interface';
import { imageSizeFromFile } from 'image-size/fromFile';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;

export interface RemarkImageOptions {
  /**
   * Directory or base URL to resolve absolute image paths
   */
  publicDir?: string;

  /**
   * Preferred placeholder type
   *
   * @defaultValue 'blur'
   */
  placeholder?: 'blur' | 'none';

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

// Based on the Nextra: https://github.com/shuding/nextra

/**
 * Turn images into Next.js Image compatible usage.
 */
export function remarkImage({
  placeholder = 'blur',
  external = true,
  useImport = true,
  publicDir = path.join(process.cwd(), 'public'),
}: RemarkImageOptions = {}): Transformer<Root, Root> {
  return async (tree, file) => {
    const importsToInject: { variableName: string; importPath: string }[] = [];
    const promises: Promise<void>[] = [];

    function getImportPath(src: string): string {
      if (!src.startsWith('/')) return src;
      const to = path.join(publicDir, src);

      if (file.dirname) {
        const relative = slash(path.relative(file.dirname, to));

        return relative.startsWith('./') ? relative : `./${relative}`;
      }

      return slash(to);
    }

    visit(tree, 'image', (node) => {
      const url = decodeURI(node.url);
      if (!url) return;
      const isExternal = EXTERNAL_URL_REGEX.test(url);

      if ((isExternal && external) || !useImport) {
        const task = getImageSize(url, publicDir)
          .then((size) => {
            if (!size.width || !size.height) return;

            Object.assign(node, {
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
                  value: url,
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
            });
          })
          .catch(() => {
            console.error(
              `[Remark Image] Failed obtain image size for ${url} with public directory ${publicDir}`,
            );
          });

        promises.push(task);
      } else if (!isExternal) {
        // Unique variable name for the given static image URL
        const variableName = `__img${importsToInject.length.toString()}`;
        const hasBlur =
          placeholder === 'blur' &&
          VALID_BLUR_EXT.some((ext) => url.endsWith(ext));

        importsToInject.push({
          variableName,
          importPath: getImportPath(url),
        });

        Object.assign(node, {
          type: 'mdxJsxFlowElement',
          name: 'img',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'alt',
              value: node.alt ?? 'image',
            },
            hasBlur && {
              type: 'mdxJsxAttribute',
              name: 'placeholder',
              value: 'blur',
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
                  },
                },
              },
            },
          ].filter(Boolean),
        });
      }
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

async function getImageSize(
  src: string,
  dir: string,
): Promise<ISizeCalculationResult> {
  const isRelative = src.startsWith('/') || !path.isAbsolute(src);
  let url: string;

  if (EXTERNAL_URL_REGEX.test(src)) {
    url = src;
  } else if (EXTERNAL_URL_REGEX.test(dir) && isRelative) {
    const base = new URL(dir);
    base.pathname = resolvePath(base.pathname, src);
    url = base.toString();
  } else {
    return imageSizeFromFile(isRelative ? path.join(dir, src) : src);
  }

  const buffer = await fetch(url).then((res) => res.arrayBuffer());

  return imageSize(new Uint8Array(buffer));
}
