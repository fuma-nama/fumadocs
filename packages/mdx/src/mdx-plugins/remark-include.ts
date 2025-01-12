import type { Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { Literal, Root } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import matter from 'gray-matter';
import type { CompilerOptions } from '@/utils/build-mdx';

export function remarkInclude(this: Processor): Transformer<Root, Root> {
  const TagName = 'include';

  async function update(
    tree: Root,
    file: string,
    processor: Processor,
    compiler?: CompilerOptions,
  ) {
    const queue: Promise<void>[] = [];

    visit(tree, ['mdxJsxFlowElement', 'paragraph'] as const, (node) => {
      let specifier: string | undefined;

      // without MDX, parse from paragraph nodes
      if (node.type === 'paragraph' && node.children.length === 3) {
        const [open, content, closure] = node.children;

        if (
          open.type === 'html' &&
          open.value === `<${TagName}>` &&
          content.type === 'text' &&
          closure.type === 'html' &&
          closure.value === `</${TagName}>`
        ) {
          specifier = content.value.trim();
        }
      } else if (node.type === 'paragraph' && node.children.length === 1) {
        const child = node.children[0];

        if (child.type === 'mdxJsxTextElement' && child.name === TagName) {
          const text = child.children.at(0);

          if (text && text.type === 'text') {
            specifier = text.value;
          }
        }
      }

      if (node.type === 'mdxJsxFlowElement' && node.name === TagName) {
        const child = node.children.at(0) as Literal | undefined;

        if (child && child.type === 'text') {
          specifier = child.value;
        }
      }

      if (!specifier) return;
      const targetPath = path.resolve(path.dirname(file), specifier);

      queue.push(
        fs.readFile(targetPath).then(async (content) => {
          const parsed = processor.parse(matter(content).content);

          compiler?.addDependency(targetPath);
          await update(parsed as Root, targetPath, processor, compiler);
          Object.assign(node, parsed);
        }),
      );

      return 'skip';
    });

    await Promise.all(queue);
  }

  return async (tree, file) => {
    await update(tree, file.path, this, file.data._compiler);
  };
}
