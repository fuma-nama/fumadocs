import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

/**
 * Makes the General Translation context group in `gt-context.json` hold the glossary terms and custom prompts of the
 * file, which has the request bodies of their upserts. The group is locked, so translation runs never write to it.
 */
const { groupId, entries, customPrompts } = JSON.parse(
  await readFile('gt-context.json', 'utf8'),
) as {
  groupId: string;
  entries: { keyword: string }[];
  customPrompts: { name: string; locale: string | null }[];
};
const group = `/v2/context-groups/${groupId}`;

/** a request with the credentials of the GT CLI: the saved login or `GT_API_KEY` */
function api<T>(path: string, method = 'GET', body?: unknown): T {
  const args = ['api', path, '--method', method];
  if (body) args.push('--header', 'Content-Type: application/json', '--input', '-');
  const out = execFileSync('gt', args, {
    input: body ? JSON.stringify(body) : undefined,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  return out && JSON.parse(out);
}

// an upsert takes at most 100 items, so one page lists the group
const keywords = new Set(entries.map((entry) => entry.keyword));
const glossary = api<{ items: { id: string; keyword: string }[] }>(`${group}/glossary?limit=100`);
for (const item of glossary.items) {
  if (!keywords.has(item.keyword)) api(`${group}/glossary/${item.id}`, 'DELETE');
}
api(`${group}/glossary`, 'POST', { entries });

const prompts = new Set(customPrompts.map((prompt) => `${prompt.name} ${prompt.locale}`));
const existing = api<{ items: { id: string; name: string; locale: string | null }[] }>(
  `${group}/custom-prompts?limit=100`,
);
for (const item of existing.items) {
  if (!prompts.has(`${item.name} ${item.locale}`))
    api(`${group}/custom-prompts/${item.id}`, 'DELETE');
}
api(`${group}/custom-prompts`, 'POST', { customPrompts });
