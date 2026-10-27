import { baseUrl } from '@/lib/metadata';
import { showcases, vercel } from '@/lib/showcases';
import { command, copy, frameworks, quotes } from '../content';
import { modules, more } from '../sections/integrations/data';
import { CORE, LAYERS, OPTIONS } from '../sections/parts/data';
import { getContributorCount, getDownloads, getStars } from '../sections/proof/data';
import { LAYOUTS, TABS, THEME_NAMES, THEMES } from '../sections/style/data';
import { blocks, fileLines } from '../sections/write/data';

// the counters in it, like the page
export const revalidate = 86400;

const format = new Intl.NumberFormat('en-US');

function url(path: string): string {
  return new URL(path, baseUrl).toString();
}

/** a figure's title and description, opening its section */
function section(item: { lead: string; title: string; description: string }): string[] {
  return ['', `## ${item.lead} ${item.title}`, '', item.description, ''];
}

/** a code fence longer than any backtick run in the lines it wraps, so their own fences stay inside */
function fenceFor(lines: string[]): string {
  let longest = 2;
  for (const line of lines) {
    for (const run of line.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  }
  return '`'.repeat(longest + 1);
}

/** the landing page as Markdown, in the page's order, also served to clients that prefer Markdown */
async function landingMarkdown(): Promise<string> {
  const [stars, downloads, contributors] = await Promise.all([
    getStars(),
    getDownloads(),
    getContributorCount(),
  ]);
  const runsOn: string[] = [];
  for (const framework of frameworks) runsOn.push(`[${framework.name}](${url(framework.href)})`);
  const out = [
    '# Fumadocs',
    '',
    `> ${copy.hero.lead} ${copy.hero.title}`,
    '',
    copy.hero.description,
    '',
    `- Get started: ${url('/docs')}`,
    `- Create a project: \`${command}\``,
    `- Runs on: ${runsOn.join(', ')}`,
    `- For LLMs: [llms.txt](${url('/llms.txt')}) indexes the docs, [llms-full.txt](${url('/llms-full.txt')}) has all of them; add \`.md\` to a docs URL for its Markdown.`,
  ];

  const layouts: string[] = [];
  for (const layout of LAYOUTS) layouts.push(layout.name);
  const themes: string[] = [];
  for (const id of THEMES) themes.push(`${THEME_NAMES[id]} (\`${id}\`)`);
  out.push(...section(copy.style));
  for (const id of TABS) {
    const tab = copy.style.tabs[id];
    out.push(`- [${tab.label}](${url(tab.href)}): ${tab.line}`);
    if (id !== 'layouts') continue;
    out.push(
      `  - Layouts: ${layouts.join(', ')}`,
      `  - Themes: ${themes.join(', ')}, each a stylesheet imported as \`@import 'fumadocs-ui/css/<id>.css';\` (${url('/docs/ui/theme')})`,
    );
  }

  const source = fileLines(blocks);
  const fence = fenceFor(source);
  out.push(...section(copy.write), `${fence}mdx title="quick-start.mdx"`, ...source, fence);

  out.push(...section(copy.parts));
  for (const layer of LAYERS) {
    const names: string[] = [];
    for (const option of layer === 'core' ? [CORE] : OPTIONS[layer])
      names.push(`${option.title} (\`${option.name}\`)`);
    out.push(`- ${layer}${layer === 'core' ? ' (kept)' : ''}: ${names.join(', ')}`);
  }

  out.push(...section(copy.integrations));
  for (const item of modules) {
    out.push(
      `- [${item.title}](${url(item.href ?? '/docs/search')}) (\`${item.pkg}\`): ${item.line}`,
    );
  }
  const extras: string[] = [];
  for (const item of more) extras.push(`[${item.name}](${url(item.href)})`);
  out.push(`- More: ${extras.join(', ')}`);

  out.push(
    ...section(copy.cli),
    `- \`npx @fumadocs/cli customize\` copies a layout into \`layouts/\` and points your route files at it.`,
    `- \`npx @fumadocs/cli add banner files\` installs components from the Fumadocs registry, with their imports rewritten for your project.`,
    `- \`npx @fumadocs/cli feature <name>\` sets up a feature, such as \`ai\` or \`search\`, and wires it into your app.`,
    `- CLI guide: ${url('/docs/cli')}`,
  );

  const counts: string[] = [];
  if (stars !== undefined) counts.push(`${format.format(stars)} GitHub stars`);
  if (downloads !== undefined)
    counts.push(`${format.format(downloads)} weekly downloads of \`fumadocs-core\``);
  if (contributors !== undefined) counts.push(`${format.format(contributors)} contributors`);
  const sites: string[] = [];
  for (const site of [...showcases, ...vercel]) sites.push(`[${site.name}](${site.url})`);
  out.push(...section(copy.proof));
  if (counts.length > 0) out.push(`- ${counts.join(', ')}.`);
  out.push(`- Showcase (${url('/showcase')}): ${sites.join(', ')}`);
  for (const quote of quotes)
    out.push('', `> ${quote.message}`, `>`, `> ${quote.name}, ${quote.role}`);

  out.push(
    ...section(copy.start),
    '```bash',
    command,
    '```',
    '',
    `Read the docs at ${url('/docs')}.`,
    '',
  );
  return out.join('\n');
}

export async function GET() {
  return new Response(await landingMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
