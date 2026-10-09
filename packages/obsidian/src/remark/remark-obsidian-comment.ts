import type { Nodes, Root } from 'mdast';
import type { Processor, Transformer } from 'unified';
import { walk } from '@/utils/mdast-walk';

const RegexDelimiter = /(?<!\\)%%/g;

/** Remove comments from the source and parse it again, delimiters in code are kept. */
export function remarkObsidianComment(this: Processor): Transformer<Root, Root> {
  return (tree, file) => {
    const source = String(file);
    if (!source.includes('%%')) return;

    const code: [start: number, end: number][] = [];
    walk<Nodes>(tree, (node) => {
      if (node.type === 'code' || node.type === 'inlineCode')
        code.push([node.position!.start.offset!, node.position!.end.offset!]);
    });

    let value = '';
    let cursor = 0;
    let open: number | undefined;
    for (const { index } of source.matchAll(RegexDelimiter)) {
      if (code.some(([start, end]) => index >= start && index < end)) continue;
      if (open === undefined) {
        open = index;
        continue;
      }

      value += source.slice(cursor, open);
      cursor = index + 2;
      open = undefined;
    }
    if (cursor === 0) return;

    file.value = value + source.slice(cursor);
    Object.assign(tree, this.parse(file));
  };
}
