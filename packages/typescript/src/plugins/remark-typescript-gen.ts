import { valueToEstree } from 'estree-util-value-to-estree';
import type { RemarkDocGenerator } from 'fumadocs-core/mdx-plugins';
import type { ExpressionStatement, ObjectExpression, Property } from 'estree';
import { toEstree as hastToEstree } from 'hast-util-to-estree';
import { renderMarkdownToHast } from '@/markdown';
import {
  type GenerateDocumentationOptions,
  generateDocumentation,
  type DocEntry,
} from '../generate/base';

export interface GeneratorOptions {
  file: string;
  name: string;
}

export function typescriptGen(
  config?: GenerateDocumentationOptions,
): RemarkDocGenerator {
  function mapProperty(entry: DocEntry): Property {
    const value = valueToEstree({
      type: entry.type,
      description: '',
      default: entry.tags.default || entry.tags.defaultValue,
    }) as ObjectExpression;

    if (entry.description) {
      const hast = hastToEstree(renderMarkdownToHast(entry.description), {
        elementAttributeNameCase: 'react',
      }).body[0] as ExpressionStatement;

      value.properties = value.properties.map((p) => {
        if (
          p.type === 'Property' &&
          p.key.type === 'Literal' &&
          p.key.value === 'description'
        ) {
          return {
            ...p,
            value: hast.expression as unknown,
          };
        }
        return p;
      }) as ObjectExpression['properties'];
    }

    return {
      type: 'Property',
      method: false,
      shorthand: false,
      computed: false,
      key: {
        type: 'Identifier',
        name: entry.name,
      },
      kind: 'init',
      value,
    };
  }

  return {
    name: 'typescript',
    run(_, options) {
      const { file, name } = options as GeneratorOptions;
      const doc = generateDocumentation(file, name, config);
      if (!doc) throw new Error(`Failed to find type ${name} in ${file}`);

      return {
        type: 'mdxJsxFlowElement',
        name: 'TypeTable',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'type',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: {
                        type: 'ObjectExpression',
                        properties: doc.entries.map(mapProperty),
                      },
                    } as ExpressionStatement,
                  ],
                },
              },
            },
          },
        ],
      };
    },
  };
}
