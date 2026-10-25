import { baseUrl } from '@/lib/metadata';
import { showcases, vercel } from '@/lib/showcases';
import { command, copy, frameworks, quotes } from './content';
import { modules, more } from './sections/integrations/modules';
import { parts, slots } from './sections/parts/data';
import { getContributorCount, getDownloads, getStars } from './sections/proof/data';
import { LAYOUTS, THEME_NAMES, THEMES } from './sections/style/data';
import { blocks, fileLines } from './sections/write/blocks';

const format = new Intl.NumberFormat('en-US');

function url(path: string): string {
  return new URL(path, baseUrl).toString();
}

function heading(item: { lead: string; title: string }): string {
  return `${item.lead} ${item.title}`;
}

/** a code fence longer than any backtick run in the lines it wraps, so their own fences stay inside */
function fenceFor(lines: string[]): string {
  let longest = 2;
  for (const line of lines) {
    for (const run of line.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  }
  return '`'.repeat(longest + 1);
}

function join(items: string[]): string {
  let out = '';
  for (let i = 0; i < items.length; i++) out += (i > 0 ? ', ' : '') + items[i];
  return out;
}

/** the landing page as Markdown, served at `/index.md` and to clients that prefer Markdown */
export async function landingMarkdown(): Promise<string> {
  const [stars, downloads, contributors] = await Promise.all([
    getStars(),
    getDownloads(),
    getContributorCount(),
  ]);
  const out: string[] = [];

  const runsOn: string[] = [];
  for (const framework of frameworks) runsOn.push(`[${framework.name}](${url(framework.href)})`);
  out.push(
    '# Fumadocs',
    '',
    `> ${heading(copy.hero)}`,
    '',
    copy.hero.description,
    '',
    `- Get started: ${url('/docs')}`,
    `- Create a project: \`${command}\``,
    `- Runs on: ${join(runsOn)}`,
    `- For LLMs: [llms.txt](${url('/llms.txt')}) indexes the docs, [llms-full.txt](${url('/llms-full.txt')}) has all of them; add \`.md\` to a docs URL for its Markdown.`,
  );

  out.push(
    '',
    `## ${heading(copy.parts)}`,
    '',
    copy.parts.description,
    '',
    '| Part | API |',
    '| --- | --- |',
  );
  for (const part of parts) out.push(`| ${part.name} | \`${part.api}\` |`);
  for (const beat of copy.parts.beats.slice(1))
    out.push('', `### ${beat.title}`, '', beat.description);
  out.push('');
  for (const slot of slots) {
    const names: string[] = [];
    for (const option of slot.options) names.push(`${option.title} (\`${option.name}\`)`);
    out.push(`- ${slot.layer}${slot.swappable ? '' : ' (kept)'}: ${join(names)}`);
  }

  const source: string[] = [];
  for (const line of fileLines(blocks)) source.push(line.text);
  const fence = fenceFor(source);
  out.push(
    '',
    `## ${heading(copy.write)}`,
    '',
    copy.write.description,
    '',
    `${fence}mdx title="quick-start.mdx"`,
    ...source,
    fence,
  );

  const layouts: string[] = [];
  for (const layout of LAYOUTS) layouts.push(layout.name);
  const themes: string[] = [];
  for (const id of THEMES) themes.push(`${THEME_NAMES[id]} (\`${id}\`)`);
  out.push(
    '',
    `## ${heading(copy.style)}`,
    '',
    copy.style.description,
    '',
    `- Layouts: ${join(layouts)} (${url('/docs/ui/layouts')})`,
    `- Themes: ${join(themes)}, each a stylesheet imported as \`@import 'fumadocs-ui/css/<id>.css';\` (${url('/docs/ui/theme')})`,
  );

  out.push(
    '',
    `## ${heading(copy.cli)}`,
    '',
    copy.cli.description,
    '',
    `- \`npx @fumadocs/cli customize\` copies a layout into \`layouts/\` and points your route files at it.`,
    `- \`npx @fumadocs/cli add banner files\` installs components from the Fumadocs registry, with their imports rewritten for your project.`,
    `- \`npx @fumadocs/cli feature <name>\` sets up a feature, such as \`ai\` or \`search\`, and wires it into your app.`,
    `- CLI guide: ${url('/docs/cli')}`,
  );

  out.push('', `## ${heading(copy.integrations)}`, '', copy.integrations.description, '');
  for (const item of modules) {
    out.push(
      `- [${item.title}](${url(item.href ?? '/docs/search')}) (\`${item.pkg}\`): ${item.line}`,
    );
  }
  const extras: string[] = [];
  for (const item of more) extras.push(`[${item.name}](${url(item.href)})`);
  out.push(`- More: ${join(extras)}`);

  const counts: string[] = [];
  if (stars !== undefined) counts.push(`${format.format(stars)} GitHub stars`);
  if (downloads)
    counts.push(`${format.format(downloads.downloads)} weekly downloads of \`fumadocs-core\``);
  if (contributors !== undefined) counts.push(`${format.format(contributors)} contributors`);
  const sites: string[] = [];
  for (const site of showcases) sites.push(`[${site.name}](${site.url})`);
  for (const site of vercel) sites.push(`[${site.name}](${site.url})`);
  out.push('', `## ${heading(copy.proof)}`, '', copy.proof.description, '');
  if (counts.length > 0) out.push(`- ${join(counts)}.`);
  out.push(`- Showcase (${url('/showcase')}): ${join(sites)}`);
  for (const quote of quotes)
    out.push('', `> ${quote.message}`, `>`, `> ${quote.name}, ${quote.role}`);

  out.push(
    '',
    `## ${heading(copy.start)}`,
    '',
    copy.start.description,
    '',
    '```bash',
    command,
    '```',
    '',
    `Read the docs at ${url('/docs')}.`,
    '',
  );
  return out.join('\n');
}
