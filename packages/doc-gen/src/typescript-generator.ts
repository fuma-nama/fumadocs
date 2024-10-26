import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { ExpressionStatement, ObjectExpression, Property } from 'estree';
import { toEstree as hastToEstree } from 'hast-util-to-estree';
import {
  type GenerateDocumentationOptions,
  generateDocumentation,
  renderMarkdownToHast,
  type DocEntry,
  getProject,
} from 'fumadocs-typescript';
import { z } from 'zod';
import { createElement, expressionToAttribute } from './utils';
import type { DocGenerator } from './remark-docgen';

export type TypescriptGeneratorOptions = GenerateDocumentationOptions;

export type TypescriptGeneratorInput = z.output<
  typeof typescriptGeneratorSchema
>;

export const typescriptGeneratorSchema = z.object({
  file: z.string({ description: 'Target TypeScript file name' }),
  name: z.string({ description: 'Exported type name' }),

  /**
   * Component name which accepts the `type` property
   *
   * @defaultValue 'TypeTable'
   */
  component: z
    .string({ description: 'Component name which accepts the `type` property' })
    .default('TypeTable'),
});

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
  options: TypescriptGeneratorOptions = {},
): DocGenerator {
  const project = options.project ?? getProject(options.config);

  async function mapProperty(entry: DocEntry): Promise<Property> {
    const value = valueToEstree({
      type: entry.type,
      description: '',
      default: entry.tags.default || entry.tags.defaultValue,
    }) as ObjectExpression;

    if (entry.description) {
      const hast = hastToEstree(await renderMarkdownToHast(entry.description), {
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
    async run(input, ctx) {
      const {
        file,
        name,
        component = 'TypeTable',
      } = typescriptGeneratorSchema.parse(input);
      const dest = path.resolve(ctx.cwd, file);
      const content = await fs.readFile(dest);

      const result = generateDocumentation(dest, name, content.toString(), {
        ...options,
        project,
      });

      if (result.length === 0)
        throw new Error(`Failed to find type ${name} in ${dest}`);

      const rendered = result.map(async (doc) => {
        const properties = await Promise.all(doc.entries.map(mapProperty));

        return createElement(component, [
          expressionToAttribute('type', {
            type: 'ObjectExpression',
            properties,
          }),
        ]);
      });

      return Promise.all(rendered);
    },
  };
}
