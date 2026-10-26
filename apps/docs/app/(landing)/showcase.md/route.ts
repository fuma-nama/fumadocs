import { blogs, showcases, vercel } from '@/lib/showcases';
import { copy, kinds, suggest } from '../showcase/data';

export const dynamic = 'force-static';

function link(name: string, url: string): string {
  return `[${name}](${url})`;
}

/** the showcase as Markdown, served at `/showcase.md` and to clients that prefer Markdown */
function showcaseMarkdown(): string {
  const out = [
    '# Showcase',
    '',
    `> ${copy.header.lead} ${copy.header.title}`,
    '',
    copy.header.summary,
    '',
    `- Suggest yours: ${suggest}`,
    '',
    `## ${copy.sites.lead} ${copy.sites.title}`,
    '',
  ];
  // the wall's order: the featured with their own words, Vercel's SDKs, then every other site
  for (const site of showcases) {
    const kind = kinds[site.url];
    if (kind) out.push(`- ${link(site.name, site.url)}: ${kind}`);
  }
  out.push(`- Vercel: ${copy.vercel}`);
  for (const site of vercel) out.push(`  - ${link(site.name, site.url)}: ${kinds[site.url]}`);
  for (const site of showcases) {
    if (!kinds[site.url] && site.image) out.push(`- ${link(site.name, site.url)}`);
  }
  for (const site of showcases) {
    if (!kinds[site.url] && !site.image) out.push(`- ${link(site.name, site.url)}`);
  }

  out.push('', `## ${copy.blogs.lead} ${copy.blogs.title}`, '');
  for (const site of blogs) out.push(`- ${link(site.name, site.url)}`);
  out.push('');
  return out.join('\n');
}

export function GET() {
  return new Response(showcaseMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
