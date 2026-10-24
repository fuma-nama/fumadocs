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
    '## Featured',
    '',
  ];
  for (const site of showcases) {
    const kind = kinds[site.url];
    if (kind) out.push(`- ${link(site.name, site.url)}: ${kind}`);
  }
  out.push('', '### Vercel', '', copy.vercel, '');
  for (const site of vercel) out.push(`- ${link(site.name, site.url)}: ${kinds[site.url]}`);

  out.push('', '## All sites', '');
  for (const site of showcases) out.push(`- ${link(site.name, site.url)}`);

  out.push('', '## Blogs', '', copy.blogs.title, '');
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
