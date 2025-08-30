import type { Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { separate } from '@/utils/mdast-separate';

const RegexDelimiter = /(?<!\\)%%/;

export function remarkObsidianComment(): Transformer<Root, Root> {
  function removeComment(nodes: RootContent[]): RootContent[] {
    const start = separate(RegexDelimiter, nodes);
    if (!start) return nodes;
    const [before, rest] = start;

    const end = separate(RegexDelimiter, rest);
    if (!end) return nodes;

    return [...before, ...removeComment(end[1])];
  }

  return (tree) => {
    tree.children = removeComment(tree.children);
  };
}
