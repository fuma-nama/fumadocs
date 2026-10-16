import { cp, rm } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { assetsPath, buildSite, clientDir, normalizeBaseUrl } from './build';
import { renderToFiles, write } from './render';

export interface Options {
  /**
   * OpenAPI documents: file paths and URLs, or a record of document ID -> file path, URL or document object
   */
  input: string[] | Record<string, string | Record<string, unknown>>;

  /**
   * @defaultValue 'operation'
   */
  per?: 'operation' | 'tag' | 'file';

  /**
   * Group the pages of operations into folders.
   *
   * @defaultValue 'tag' when operations have tags, otherwise 'none'
   */
  groupBy?: 'tag' | 'route' | 'none';

  /**
   * The URL path the docs are served under.
   *
   * @defaultValue '/'
   */
  baseUrl?: string;

  /**
   * @defaultValue `info.title` of the document, `API Reference` for multiple documents
   */
  title?: string;

  /**
   * URL of a CORS proxy for the API playground.
   */
  proxyUrl?: string;
}

export interface StaticOptions extends Options {
  /** output directory, emptied before writing */
  outDir: string;
}

/** config file of the CLI */
export interface Config extends Options {
  /**
   * Output directory of `build`.
   *
   * @defaultValue 'out'
   */
  outDir?: string;
}

/**
 * Write the docs as static HTML files.
 */
export async function generateStatic({ outDir, ...options }: StaticOptions): Promise<void> {
  const fromOutDir = path.relative(outDir, process.cwd());
  if (!fromOutDir.startsWith('..') && !path.isAbsolute(fromOutDir))
    throw new Error(`The output directory ${outDir} must not contain the working directory.`);

  const { files, urls, renderInput } = await buildSite(options);
  const base = normalizeBaseUrl(options.baseUrl);

  await rm(outDir, { recursive: true, force: true });
  await cp(new URL('assets', clientDir), path.join(outDir, assetsPath, 'assets'), {
    recursive: true,
  });
  for (const [file, content] of files) await write(path.join(outDir, file), content);

  const pages: [pathname: string, file: string][] = [['', path.join(outDir, '404.html')]];
  for (const url of urls) {
    const file = path.join(outDir, url.slice(base.length), 'index.html');
    const relative = path.relative(outDir, file);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error(`The page ${url} would be written outside of ${outDir}.`);

    pages.push([url, file]);
  }

  // each worker renders at least 100 pages to pay off its startup, and holds a copy of the site:
  // past half the logical cores (SMT siblings, efficiency cores), more workers mostly add memory
  const count = Math.min(Math.floor(availableParallelism() / 2), Math.floor(pages.length / 100));
  if (count < 2) return renderToFiles(renderInput, pages);

  const workers: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    const slice: typeof pages = [];
    for (let j = i; j < pages.length; j += count) slice.push(pages[j]);

    workers.push(renderInWorker([renderInput, slice]));
  }
  await Promise.all(workers);
}

/** `renderToFiles()` in a worker thread */
function renderInWorker(args: Parameters<typeof renderToFiles>): Promise<void> {
  return new Promise((resolve, reject) => {
    new Worker(new URL('./worker.js', import.meta.url), { workerData: args })
      .once('error', reject)
      .once('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`A worker exited with code ${code}.`)),
      );
  });
}
