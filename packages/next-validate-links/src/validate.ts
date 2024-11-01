import { readFile } from 'node:fs/promises';
import picocolors from 'picocolors';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

const processor = remark();

export async function validateFiles(files: string[], urls: Set<string>) {
  async function run(file: string) {
    const content = await readFile(file)
      .then((res) => res.toString())
      .catch(() => '');

    const detected = validateMarkdown(content, urls);

    if (detected.length > 0) {
      console.error(
        picocolors.bold(picocolors.redBright(`Invalid URLs in ${file}:`)),
      );
      detected.forEach(([content, line, column]) => {
        console.error(
          `${picocolors.bold(content)} at line ${line}, column ${column}`,
        );
      });
      console.error(picocolors.dim('------'));
    }
  }

  await Promise.all(files.map(run));
}

export function validateMarkdown(content: string, urls: Set<string>) {
  const tree = processor.parse({ value: content });
  const detected: [content: string, line: number, column: number][] = [];

  visit(tree, 'link', (node) => {
    let url = node.url;
    url = url.split('#', 2)[0];
    url = url.split('?', 2)[0];
    if (url.length === 0) return;

    if (!url.match(/https?:\/\//) && !urls.has(url) && node.position) {
      detected.push([
        node.url,
        node.position.start.line,
        node.position.start.column,
      ]);
    }
  });

  return detected;
}
