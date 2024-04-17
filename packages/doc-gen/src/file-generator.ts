import fs from 'node:fs';
import path from 'node:path';
import type { Code, Paragraph } from 'mdast';
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

export interface FileGeneratorInput {
  file: string;

  /**
   * Turn file content into a code block
   *
   * @defaultValue false
   */
  codeblock?: CodeBlock | boolean;
}

interface CodeBlock {
  lang?: string;
  meta?: string;
}

export function fileGenerator({
  relative = false,
  trim = true,
}: FileGeneratorOptions = {}): DocGenerator {
  return {
    name: 'file',
    run(input, ctx) {
      const { file, codeblock = false } = input as FileGeneratorInput;

      const dest = relative
        ? path.resolve(ctx.cwd, path.dirname(ctx.path), file)
        : path.resolve(ctx.cwd, file);
      let value = fs.readFileSync(dest).toString();
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
