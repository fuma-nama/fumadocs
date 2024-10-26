import path from 'node:path';
import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import sizeOf from 'image-size';
import { type ISizeCalculationResult } from 'image-size/dist/types/interface';
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm';
import slash from '@/utils/slash';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;

export interface RemarkImageOptions {
  /**
   * Directory to resolve absolute image paths
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

      if (file.path) {
        const relative = path.relative(
          path.dirname(file.path),
          path.join(publicDir, src),
        );

        return relative.startsWith('./') ? relative : `./${relative}`;
      }

      return path.join(publicDir, src);
    }

    visit(tree, 'image', (node) => {
      const src = decodeURI(node.url);
      if (!src) return;
      const isExternal = EXTERNAL_URL_REGEX.test(src);

      if ((isExternal && external) || !useImport) {
        promises.push(
          getImageSize(src, publicDir).then((size) => {
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
                  value: src,
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
          }),
        );
      } else if (!isExternal) {
        // Unique variable name for the given static image URL
        const variableName = `__img${importsToInject.length.toString()}`;
        const hasBlur =
          placeholder === 'blur' &&
          VALID_BLUR_EXT.some((ext) => src.endsWith(ext));

        importsToInject.push({
          variableName,
          importPath: slash(getImportPath(src)),
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

    if (importsToInject.length > 0) {
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
    }
  };
}

/**
 * Resolve `src` to an absolute path
 */
function resolveSrc(src: string, dir: string): string {
  return src.startsWith('/') || !path.isAbsolute(src)
    ? path.join(dir, src)
    : src;
}

async function getImageSize(
  src: string,
  dir: string,
): Promise<ISizeCalculationResult> {
  if (EXTERNAL_URL_REGEX.test(src)) {
    const res = await fetch(src);

    return sizeOf(
      await res.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
    );
  }

  return sizeOf(resolveSrc(src, dir));
}
