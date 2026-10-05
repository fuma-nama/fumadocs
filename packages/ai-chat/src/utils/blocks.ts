const listItem = /^(?:[-*+]|\d{1,9}[.)])\s/;

/** top-level blocks split at blank lines, a block continues through code fences, indented lines and list items */
export function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let block = '';
  let fence: string | undefined;
  let blank = false;
  let inList = false;

  for (const line of text.split('\n')) {
    if (fence) {
      block += `\n${line}`;
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = undefined;
      continue;
    }

    if (line.trim().length === 0) {
      blank = true;
      continue;
    }

    const indented = /^\s/.test(line);
    if (block.length === 0) {
      block = line;
    } else if (blank && !indented && !(inList && listItem.test(line))) {
      blocks.push(block);
      block = line;
    } else {
      block += blank ? `\n\n${line}` : `\n${line}`;
    }

    if (!indented) inList = listItem.test(line);
    blank = false;
    fence = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
  }

  if (block.length > 0) blocks.push(block);
  return blocks;
}
