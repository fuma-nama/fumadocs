import { readFile } from 'node:fs/promises';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

const processor = remark();

export type ValidateError = {
  file: string;
  detected: DetectedError[];
};

type DetectedError = [url: string, line: number, column: number];

export type ValidateConfig = {
  /**
   * Available URLs (may include hashes and query parameters)
   */
  urls: Set<string>;

  /**
   * validate the hash of URLs
   *
   * @defaultValue false
   */
  validateHash?: boolean;

  /**
   * validate the query of URLs
   *
   * @defaultValue false
   */
  validateQuery?: boolean;
};

export async function validateFiles(
  files: string[],
  config: ValidateConfig,
): Promise<ValidateError[]> {
  async function run(file: string): Promise<ValidateError> {
    const content = await readFile(file)
      .then((res) => res.toString())
      .catch(() => '');

    return {
      file,
      detected: validateMarkdown(content, config),
    };
  }

  return (await Promise.all(files.map(run))).filter(
    (err) => err.detected.length > 0,
  );
}

export function validateMarkdown(content: string, config: ValidateConfig) {
  const tree = processor.parse({ value: content });
  const detected: DetectedError[] = [];

  visit(tree, 'link', (node) => {
    let url = node.url;

    if (!config.validateHash) {
      url = url.split('#', 2)[0];
    }

    if (!config.validateQuery) {
      url = url.split('?', 2)[0];
    }

    if (url.length === 0) return;

    if (!url.match(/https?:\/\//) && !config.urls.has(url) && node.position) {
      detected.push([
        node.url,
        node.position.start.line,
        node.position.start.column,
      ]);
    }
  });

  return detected;
}
