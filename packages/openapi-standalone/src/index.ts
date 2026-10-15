import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assetsPath, clientDir, createSite, normalizeBaseUrl } from './site';

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

  const site = await createSite(options);
  const base = normalizeBaseUrl(options.baseUrl);

  await rm(outDir, { recursive: true, force: true });
  await cp(new URL('assets', clientDir), path.join(outDir, assetsPath, 'assets'), {
    recursive: true,
  });

  for (const [file, content] of site.files) await write(path.join(outDir, file), content);
  for (const url of site.urls) {
    const file = path.join(outDir, url.slice(base.length), 'index.html');
    const relative = path.relative(outDir, file);
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error(`The page ${url} would be written outside of ${outDir}.`);

    await write(file, (await site.render(url)).html);
  }

  await write(path.join(outDir, '404.html'), (await site.render('')).html);
}

async function write(file: string, content: string) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}
