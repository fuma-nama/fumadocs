import { type Code, type Root } from 'mdast';
import { type Transformer } from 'unified';
import { visit } from 'unist-util-visit';

export interface RemarkDocGenerator {
  name: string;

  /**
   * Transform codeblocks to another mdast element
   */
  run: (node: Code, options: unknown) => unknown;
}

export interface RemarkDocGenOptions {
  generators?: RemarkDocGenerator[];
}

const metaRegex = /doc-gen:(?<name>.+)/;

export function remarkDocGen({
  generators = [],
}: RemarkDocGenOptions): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'code', (c) => {
      if (c.lang !== 'json' || !c.meta) return;

      const matches = metaRegex.exec(c.meta);
      if (!matches) return;

      const name = matches[1];
      const gen = generators.find((g) => g.name === name);
      const result = gen?.run(c, JSON.parse(c.value));

      if (result) Object.assign(c, result);
    });
  };
}
