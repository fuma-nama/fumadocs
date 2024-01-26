import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Image, Root, RootContent } from 'mdast';
import type { Transformer } from 'unified';
import slash from '@/utils/slash';
import { visit } from './unist-visit';

const VALID_BLUR_EXT = ['.jpeg', '.png', '.webp', '.avif', '.jpg'];
const EXTERNAL_URL_REGEX = /^https?:\/\//;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

export interface RemarkImageOptions {
  /**
   * Preferred placeholder type
   *
   * @defaultValue 'blur'
   */
  placeholder?: 'blur' | 'none';
}

// Based on the Nextra: https://github.com/shuding/nextra

/**
 * Turn images into static imports
 */
export function remarkImage({
  placeholder = 'blur',
}: RemarkImageOptions = {}): Transformer<Root, Root> {
  return (tree, _file, done) => {
    const importsToInject: { variableName: string; importPath: string }[] = [];

    visit(tree, ['image'], (node: Image) => {
      let url = decodeURI(node.url);

      if (!url || EXTERNAL_URL_REGEX.test(url)) {
        return;
      }

      if (url.startsWith('/')) {
        const urlPath = path.join(PUBLIC_DIR, url);

        if (!existsSync(urlPath)) {
          return;
        }

        url = slash(urlPath);
      }

      // Unique variable name for the given static image URL
      const variableName = `__img${importsToInject.length}`;
      const hasBlur =
        placeholder === 'blur' &&
        VALID_BLUR_EXT.some((ext) => url.endsWith(ext));
      importsToInject.push({ variableName, importPath: url });
      // Replace the image node with an MDX component node (Next.js Image)
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
    });

    if (importsToInject.length) {
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
          }) as RootContent,
      );

      tree.children.unshift(...imports);
    }

    done();
  };
}
