import { type BlockContent, type Code, type Root } from 'mdast';
import { type Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

export interface DocGenerator {
  name: string;

  /**
   * Transform codeblocks to another mdast element
   */
  run: (input: unknown, context: Context) => object | undefined;

  onFile?: (tree: Root, file: VFile) => void;
}

interface Context {
  node: Code;
  path: string;
  cwd: string;
}

export interface RemarkDocGenOptions {
  generators?: DocGenerator[];
}

const metaRegex = /doc-gen:(?<name>.+)/;

export function remarkDocGen({
  generators = [],
}: RemarkDocGenOptions): Transformer<Root, Root> {
  return (tree, file) => {
    generators.forEach((gen) => gen.onFile?.(tree, file));

    visit(tree, 'code', (code, index, parent) => {
      if (code.lang !== 'json' || !code.meta) return;

      const matches = metaRegex.exec(code.meta);
      if (!matches) return;

      const name = matches[1];
      const gen = generators.find((g) => g.name === name);
      const result = gen?.run(JSON.parse(code.value), {
        cwd: file.cwd,
        path: file.path,
        node: code,
      });

      if (result && typeof index === 'number' && parent) {
        parent.children[index] = result as BlockContent;
      }
    });
  };
}
