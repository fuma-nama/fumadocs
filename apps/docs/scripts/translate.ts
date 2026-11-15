import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { glob, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { type Data, mdxToMdast } from 'satteri';
import { remarkHeading } from '@fumadocs/satteri/remark-heading';
import { remarkSteps } from '@fumadocs/satteri/remark-steps';

/**
 * Translates the docs with General Translation into `page.<locale>.mdx` beside each page, for the files changed since
 * `translations.lock.json`. A translated page keeps the heading IDs of its source and includes the translations of MDX
 * files; meta files only get their labels translated.
 */
const { defaultLocale, locales } = JSON.parse(await readFile('gt.config.json', 'utf8')) as {
  defaultLocale: string;
  locales: string[];
};
const lockFile = 'translations.lock.json';
const lock: Record<string, string> = JSON.parse(await readFile(lockFile, 'utf8').catch(() => '{}'));
const translation = new RegExp(`\\.(?:${locales.join('|')})\\.\\w+$`);
const label = { dataFormat: 'STRING', context: 'a label in the sidebar of the docs' };

type Requests = Record<string, { source: string; metadata: object }>;

const hash = (content: string) => createHash('sha256').update(content).digest('hex');

/** a request with the credentials of the GT CLI: the saved login or `GT_API_KEY` */
async function api<T>(apiPath: string, method = 'GET', body?: unknown): Promise<T> {
  const args = ['api', apiPath, '--method', method, '--header', 'gt-api-version: 2026-03-06.v1'];
  // a file, the CLI can't read large bodies from a busy pipe
  const input = body === undefined ? undefined : path.join(tmpdir(), `gt-${randomUUID()}.json`);
  if (input) {
    await writeFile(input, JSON.stringify(body));
    args.push('--header', 'Content-Type: application/json', '--input', input);
  }
  try {
    const { stdout } = await promisify(execFile)('gt', args, { maxBuffer: 1 << 28 });
    return stdout && JSON.parse(stdout);
  } finally {
    if (input) await rm(input);
  }
}

/** the translations that succeeded, GT translates the requests of a call in parallel */
async function translate(locale: string, requests: Requests): Promise<Record<string, string>> {
  if (Object.keys(requests).length === 0) return {};
  const results = await api<Record<string, { translation?: string; error?: string }>>(
    '/v2/translate',
    'POST',
    { requests, sourceLocale: defaultLocale, targetLocale: locale, metadata: {} },
  ).catch((error: unknown) => {
    console.error(error);
    return {};
  });
  const out: Record<string, string> = {};
  for (const [key, { translation, error }] of Object.entries(results)) {
    if (typeof translation === 'string') out[key] = translation;
    else console.error(`${key}: ${error}`);
  }
  return out;
}

/** a translated page with the heading IDs of its source, and the translations of the MDX files it includes */
function localize(file: string, source: string, translated: string, locale: string): string {
  const data: Data = {};
  mdxToMdast(source, { data, mdastPlugins: [remarkSteps(), remarkHeading()] });
  const ids = data.toc!.map((item) => item.url.slice(1));
  const edits: { start: number; end: number; text: string }[] = [];
  let heading = 0;

  mdxToMdast(translated, {
    mdastPlugins: [
      {
        name: 'localize',
        options: { position: true },
        heading(node, ctx) {
          const id = ids[heading++];
          const end = node.position!.end.offset!;
          if (id && !/\[#[^\]]+]\s*$/.test(ctx.textContent(node)))
            edits.push({ start: end, end, text: ` [#${id}]` });
        },
        mdxJsxFlowElement(node) {
          if (node.name !== 'include') return;
          const { start, end } = node.position!;
          const element = translated.slice(start.offset, end.offset);
          const text = element.replace(
            /^(<include(?![^>]*\bcwd\b)[^>]*>\s*)([^<\s#]+)\.mdx/,
            (match, open: string, target: string) =>
              existsSync(path.join(path.dirname(file), `${target}.mdx`))
                ? `${open}${target}.${locale}.mdx`
                : match,
          );
          if (text !== element) edits.push({ start: start.offset!, end: end.offset!, text });
        },
      },
    ],
  });

  if (heading !== ids.length)
    throw new Error(`${file}: ${heading} headings, the source has ${ids.length}`);
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start))
    translated = translated.slice(0, start) + text + translated.slice(end);
  return translated;
}

/** in code, the string literals of the title, description and separators of `pages` */
const codeLabels = /(\b(?:title|description): '|'---)(.+?)(---'|')/g;

/** the labels of a meta file: its title, description and separators */
function getLabels(file: string, source: string): Record<string, string> {
  const labels: Record<string, string> = {};
  if (file.endsWith('.ts'))
    for (const [, , value] of source.matchAll(codeLabels)) labels[value] = value;
  else {
    const meta = JSON.parse(source) as { title?: string; description?: string; pages?: string[] };
    if (meta.title) labels.title = meta.title;
    if (meta.description) labels.description = meta.description;
    meta.pages?.forEach((page, i) => {
      const value = /^---(.+)---$/.exec(page)?.[1];
      if (value) labels[i] = value;
    });
  }
  return labels;
}

function setLabels(file: string, source: string, labels: Record<string, string>): string {
  if (file.endsWith('.ts'))
    return source.replace(
      codeLabels,
      (_, open: string, value: string, close: string) => open + labels[value] + close,
    );
  const meta = JSON.parse(source) as { title?: string; description?: string; pages?: string[] };
  if (labels.title) meta.title = labels.title;
  if (labels.description) meta.description = labels.description;
  meta.pages = meta.pages?.map((page, i) => (i in labels ? `---${labels[i]}---` : page));
  return `${JSON.stringify(meta, null, 2)}\n`;
}

// the context group holds the glossary terms and prompts of `gt-context.json`, at most 100 each like an upsert
const contextSource = await readFile('gt-context.json', 'utf8');
if (lock['gt-context.json'] !== hash(contextSource)) {
  const context = JSON.parse(contextSource) as {
    groupId: string;
    entries: { keyword: string }[];
    customPrompts: { name: string; locale: string | null }[];
  };
  const group = `/v2/context-groups/${context.groupId}`;
  const keywords = new Set(context.entries.map((entry) => entry.keyword));
  const terms = await api<{ items: { id: string; keyword: string }[] }>(
    `${group}/glossary?limit=100`,
  );
  for (const item of terms.items) {
    if (!keywords.has(item.keyword)) await api(`${group}/glossary/${item.id}`, 'DELETE');
  }
  await api(`${group}/glossary`, 'POST', { entries: context.entries });
  const prompts = new Set(context.customPrompts.map((prompt) => `${prompt.name} ${prompt.locale}`));
  const existing = await api<{ items: { id: string; name: string; locale: string | null }[] }>(
    `${group}/custom-prompts?limit=100`,
  );
  for (const item of existing.items) {
    if (!prompts.has(`${item.name} ${item.locale}`))
      await api(`${group}/custom-prompts/${item.id}`, 'DELETE');
  }
  await api(`${group}/custom-prompts`, 'POST', { customPrompts: context.customPrompts });
  lock['gt-context.json'] = hash(contextSource);
}

const files = await Array.fromAsync(glob('content/docs/**/{{*,.*}.mdx,meta{,.*}.{json,ts}}'));
const sources = new Set(files.filter((file) => !translation.test(file)));
for (const file of files) {
  // a translation of a deleted page
  if (!sources.has(file) && !sources.has(file.replace(translation, path.extname(file))))
    await rm(file);
}

const changed: { file: string; source: string; hash: string; locales: string[] }[] = [];
for (const file of sources) {
  const source = await readFile(file, 'utf8');
  const ext = path.extname(file);
  // the locales without a translation, or every locale when the source changed
  const outdated = locales.filter(
    (locale) =>
      lock[file] !== hash(source) || !existsSync(`${file.slice(0, -ext.length)}.${locale}${ext}`),
  );
  if (outdated.length > 0) changed.push({ file, source, hash: hash(source), locales: outdated });
}
console.log(`translating ${changed.length} files`);

const failed = new Set<string>();
for (const locale of locales) {
  const target = (file: string) =>
    `${file.slice(0, -path.extname(file).length)}.${locale}${path.extname(file)}`;
  const outdated = changed.filter((item) => item.locales.includes(locale));
  const pages = outdated.filter(({ file }) => file.endsWith('.mdx'));
  const metas = outdated.filter(({ file }) => !file.endsWith('.mdx'));
  const batches: (typeof pages)[] = [];
  for (let i = 0; i < pages.length; i += 10) batches.push(pages.slice(i, i + 10));

  const labels: Requests = {};
  for (const { file, source } of metas)
    for (const [key, value] of Object.entries(getLabels(file, source)))
      labels[`${file} ${key}`] = { source: value, metadata: label };

  await Promise.all([
    ...batches.map(async (batch) => {
      const requests: Requests = {};
      for (const { file, source } of batch)
        requests[file] = { source, metadata: { fileFormat: 'MDX', actionType: 'standard' } };
      const translated = await translate(locale, requests);
      for (const { file, source } of batch) {
        try {
          if (!(file in translated)) throw new Error(`${file}: not translated`);
          await writeFile(target(file), localize(file, source, translated[file], locale));
        } catch (error) {
          console.error(error);
          failed.add(file);
        }
      }
    }),
    translate(locale, labels).then(async (translated) => {
      for (const { file, source } of metas) {
        const keys = Object.keys(getLabels(file, source));
        if (keys.some((key) => !(`${file} ${key}` in translated))) {
          failed.add(file);
          continue;
        }
        const values = Object.fromEntries(keys.map((key) => [key, translated[`${file} ${key}`]]));
        await writeFile(target(file), setLabels(file, source, values));
      }
    }),
  ]);
}

for (const file of Object.keys(lock))
  if (file !== 'gt-context.json' && !sources.has(file)) delete lock[file];
for (const { file, hash } of changed) if (!failed.has(file)) lock[file] = hash;
await writeFile(
  lockFile,
  `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 2)}\n`,
);
if (failed.size > 0) process.exitCode = 1;
