import fs from 'node:fs';
import path from 'node:path';
import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';

const regex = /^\|reference:(?<path>.+)\|/;

export interface RemarkDynamicContentOptions {
  /** @defaultValue true */
  trim?: boolean;

  /**
   * Resolve reference files relative to `vfile.path`
   * @defaultValue false
   */
  relative?: boolean;

  /**
   * Filter specific element types
   * @defaultValue ['text','code']
   * */
  visit?: string[];
}

/**
 * Copy content from referenced file
 *
 * @example
 * |reference:../path/to/file.ts|
 */
export function remarkDynamicContent(
  options: RemarkDynamicContentOptions = {},
): Transformer<Root, Root> {
  const {
    trim = true,
    relative = false,
    visit: filter = ['text', 'code'],
  } = options;

  return (tree, file) => {
    const cwd = file.cwd;

    visit(tree, filter, (node) => {
      const canReplace = 'value' in node && typeof node.value === 'string';
      if (!canReplace) return;

      const result = regex.exec(node.value);

      if (result) {
        const dest = relative
          ? path.resolve(cwd, path.dirname(file.path), result[1])
          : path.resolve(cwd, result[1]);
        let value = fs.readFileSync(dest).toString();
        if (trim) value = value.trim();

        node.value = value;
      }
    });
  };
}
