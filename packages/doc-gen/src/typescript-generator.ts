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
import { getProgram } from 'fumadocs-typescript';
import type { Program } from 'typescript';
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
  let program: Program | undefined;

  function loadProgram(): Program {
    return options.config && 'program' in options.config
      ? options.config.program
      : getProgram(options.config);
  }

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
    onFile() {
      if (process.env.NODE_ENV === 'development' || !program) {
        program = loadProgram();
      }
    },
    run(input, ctx) {
      const {
        file,
        name,
        component = 'TypeTable',
      } = typescriptGeneratorSchema.parse(input);
      const dest = path.resolve(ctx.cwd, file);

      const doc = generateDocumentation(dest, name, {
        ...options,
        config: { program: program ?? loadProgram() },
      });
      if (!doc) throw new Error(`Failed to find type ${name} in ${dest}`);

      return createElement(component, [
        expressionToAttribute('type', {
          type: 'ObjectExpression',
          properties: doc.entries.map(mapProperty),
        }),
      ]);
    },
  };
}
