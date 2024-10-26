import { type BlockContent, type Code, type Root } from 'mdast';
import { type Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

type Awaitable<T> = T | Promise<T>;

export interface DocGenerator {
  name: string;

  /**
   * Transform codeblocks to another mdast element
   */
  run: (
    input: unknown,
    context: Context,
  ) => Awaitable<object | object[] | undefined>;

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
  return async (tree, file) => {
    generators.forEach((gen) => gen.onFile?.(tree, file));
    const queue: Promise<void>[] = [];

    visit(tree, 'code', (code, _, parent) => {
      if (code.lang !== 'json' || !code.meta || !parent) return;

      const matches = metaRegex.exec(code.meta);
      if (!matches) return;

      const name = matches[1];
      const gen = generators.find((g) => g.name === name);

      const run = async (): Promise<void> => {
        const result = await gen?.run(JSON.parse(code.value), {
          cwd: file.cwd,
          path: file.path,
          node: code,
        });
        const index = parent.children.findIndex((c) => c === code);

        if (result && index !== -1) {
          const items = Array.isArray(result)
            ? (result as BlockContent[])
            : [result as BlockContent];

          parent.children.splice(index, 1, ...items);
        }
      };

      queue.push(run());
    });

    await Promise.all(queue);
  };
}
