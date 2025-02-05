import * as fs from 'node:fs';
import grayMatter from 'gray-matter';

/**
 * Read frontmatter via stream, it is faster for large Markdown/MDX files
 */
export async function readFrontmatter(file: string): Promise<unknown> {
  const readStream = fs.createReadStream(file, {
    highWaterMark: 250,
  });

  return new Promise((res, rej) => {
    let idx = 0;
    let str = '';

    readStream.on('data', (_chunk) => {
      const chunk = _chunk.toString();
      if (idx === 0 && !chunk.startsWith('---')) {
        res({});
        readStream.close();
        return;
      }

      str += chunk;
      idx++;

      if (str.includes('\n---')) {
        res(
          grayMatter({
            content: str,
          }).data,
        );

        readStream.close();
      }
    });

    readStream.on('end', () => res({}));
    readStream.on('error', (e) => rej(e));
  });
}
