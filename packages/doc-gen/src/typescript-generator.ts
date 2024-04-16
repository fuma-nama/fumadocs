import * as path from 'node:path';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { ExpressionStatement, ObjectExpression, Property } from 'estree';
import { toEstree as hastToEstree } from 'hast-util-to-estree';
import {
  type GenerateDocumentationOptions,
  generateDocumentation,
  renderMarkdownToHast,
  type DocEntry,
} from 'fumadocs-typescript';
import { createElement } from './utils';
import type { DocGenerator } from './remark-docgen';

export type TypescriptGeneratorOptions = GenerateDocumentationOptions;

export interface TypescriptGeneratorInput {
  file: string;
  name: string;

  /**
   * Component name which accepts the `type` property
   *
   * @defaultValue 'TypeTable'
   */
  component?: string;
}

export interface VirtualTypeTableProps {
  type: Record<
    string,
    {
      type: string;

      /**
       * React nodes
       */
      description: unknown;

      default?: string;
    }
  >;
}

/**
 * Docs generator for Typescript
 *
 * @param options - configuration
 */
export function typescriptGenerator(
  options?: TypescriptGeneratorOptions,
): DocGenerator {
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

      value.properties.push({
        type: 'Property',
        method: false,
        shorthand: false,
        computed: false,
        key: {
          type: 'Identifier',
          name: 'description',
        },
        kind: 'init',
        value: hast.expression,
      });
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
    run(input, ctx) {
      const {
        file,
        name,
        component = 'TypeTable',
      } = input as TypescriptGeneratorInput;
      const dest = path.resolve(ctx.cwd, file);

      const doc = generateDocumentation(dest, name, options);
      if (!doc) throw new Error(`Failed to find type ${name} in ${dest}`);

      return createElement(component, {
        type: {
          type: 'ObjectExpression',
          properties: doc.entries.map(mapProperty),
        },
      });
    },
  };
}
