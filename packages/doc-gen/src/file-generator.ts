import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Code, Paragraph } from 'mdast';
import { z } from 'zod';
import type { DocGenerator } from './remark-docgen';

export interface FileGeneratorOptions {
  /** @defaultValue true */
  trim?: boolean;

  /**
   * Resolve reference files relative to `vfile.path`
   *
   * @defaultValue false
   */
  relative?: boolean;
}

export type FileGeneratorInput = z.output<typeof fileGeneratorSchema>;

export const fileGeneratorSchema = z.object({
  file: z.string(),

  /**
   * Turn file content into a code block
   *
   * @defaultValue false
   */
  codeblock: z
    .union([
      z.object({
        lang: z.string().optional(),
        meta: z.string().optional(),
      }),
      z.boolean(),
    ])
    .default(false),
});

export function fileGenerator({
  relative = false,
  trim = true,
}: FileGeneratorOptions = {}): DocGenerator {
  return {
    name: 'file',
    async run(input, ctx) {
      const { file, codeblock = false } = fileGeneratorSchema.parse(input);

      const dest = relative
        ? path.resolve(ctx.cwd, path.dirname(ctx.path), file)
        : path.resolve(ctx.cwd, file);
      let value = await fs.readFile(dest).then((res) => res.toString());
      if (trim) value = value.trim();

      if (codeblock === false) {
        return {
          type: 'paragraph',
          children: [{ type: 'text', value }],
        } as Paragraph;
      }

      const codeOptions = codeblock === true ? {} : codeblock;

      return {
        type: 'code',
        lang: codeOptions.lang ?? path.extname(dest).slice(1),
        meta: codeOptions.meta,
        value,
      } as Code;
    },
  };
}
