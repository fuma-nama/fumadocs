export type JsonTreeNode =
  | {
      type: 'file';
      name: string;
    }
  | {
      type: 'directory';
      name: string;
      contents: JsonTreeNode[];
    }
  | {
      type: 'report';
    }
  | {
      type: 'link';
      name: string;
    };

const scanned = ['file', 'directory', 'link'];

export function treeToMdx(input: JsonTreeNode[], noRoot = false): string {
  function toNode(item: JsonTreeNode): string {
    if (item.type === 'file' || item.type === 'link') {
      return `<File name=${JSON.stringify(item.name)} />`;
    }

    if (item.type === 'directory') {
      if (item.contents.length === 1 && 'name' in item.contents[0]) {
        const child = item.contents[0];

        return toNode({
          ...child,
          name: `${item.name}/${child.name}`,
        });
      }

      return `<Folder name=${JSON.stringify(item.name)}>
${item.contents.map(toNode).filter(Boolean).join('\n')}
</Folder>`;
    }

    return '';
  }

  let children = input.filter((v) => scanned.includes(v.type));

  if (noRoot && children.length === 1 && input[0].type === 'directory') {
    children = input[0].contents;
  }

  return `<Files>
${children.map(toNode).filter(Boolean).join('\n')}
</Files>`;
}

export function treeToJavaScript(
  input: JsonTreeNode[],
  noRoot?: boolean,
  importName = 'fumadocs-ui/components/files',
): string {
  return `import { File, Files, Folder } from ${JSON.stringify(importName)}

export default (${treeToMdx(input, noRoot)})`;
}
