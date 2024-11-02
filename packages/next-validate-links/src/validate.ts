import { readFile } from 'node:fs/promises';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { ScanResult } from '@/scan';
import path from 'node:path';
import matter from 'gray-matter';

const processor = remark();

export type ValidateError = {
  file: string;
  detected: DetectedError[];
};

type DetectedError = [
  url: string,
  line: number,
  column: number,
  reason: 'not-found' | 'invalid-fragment' | 'invalid-query',
];

export type ValidateConfig = {
  /**
   * Available URLs (including hashes and query parameters)
   */
  scanned: ScanResult;

  /**
   * don't validate the fragment/hash of URLs
   *
   * @defaultValue false
   */
  ignoreFragment?: boolean;

  /**
   * don't validate the query of URLs
   *
   * @defaultValue false
   */
  ignoreQuery?: boolean;
};

type File =
  | string
  | {
      path: string;
      content: string;
    };

/**
 * Validate markdown files
 *
 * @param files - file paths or file objects
 * @param config - configurations
 */
export async function validateFiles(
  files: File[],
  config: ValidateConfig,
): Promise<ValidateError[]> {
  const mdExtensions = ['.md', '.mdx'];

  async function run(file: File): Promise<ValidateError> {
    const finalFile =
      typeof file === 'string'
        ? {
            path: file,
            content: await readFile(file)
              .then((res) => res.toString())
              .catch(() => ''),
          }
        : file;

    if (!mdExtensions.includes(path.extname(finalFile.path))) {
      console.warn(`format unsupported: ${finalFile.path}`);

      return { file: finalFile.path, detected: [] };
    }

    return {
      file: finalFile.path,
      detected: validateMarkdown(finalFile.content, config),
    };
  }

  return (await Promise.all(files.map(run))).filter(
    (err) => err.detected.length > 0,
  );
}

export function validateMarkdown(content: string, config: ValidateConfig) {
  const tree = processor.parse({ value: matter({ content }).content });
  const detected: DetectedError[] = [];

  visit(tree, 'link', (node) => {
    // ignore generated nodes
    if (!node.position || node.url.match(/https?:\/\//)) return;

    const [urlWithoutFragment, fragment] = node.url.split('#', 2);
    const [url, query] = urlWithoutFragment.split('?', 2);

    if (url.length === 0) return;

    let meta = config.scanned.urls.get(url);
    if (!meta) {
      meta = config.scanned.fallbackUrls.find((fallbackUrl) => {
        return fallbackUrl.url.test(url);
      })?.meta;
    }

    if (meta) {
      const validFragment =
        config.ignoreFragment ||
        !fragment ||
        !meta.hashes ||
        meta.hashes.includes(fragment);

      if (!validFragment) {
        detected.push([
          node.url,
          node.position.start.line,
          node.position.start.column,
          'invalid-fragment',
        ]);
        return;
      }

      const validQuery =
        config.ignoreQuery ||
        !query ||
        !meta.queries ||
        meta.queries.some(
          (item) => new URLSearchParams(item).toString() === query,
        );

      if (!validQuery) {
        detected.push([
          node.url,
          node.position.start.line,
          node.position.start.column,
          'invalid-query',
        ]);
        return;
      }
    } else {
      detected.push([
        node.url,
        node.position.start.line,
        node.position.start.column,
        'not-found',
      ]);
    }
  });

  return detected;
}
