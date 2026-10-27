import { blogs, showcases, vercel } from '@/lib/showcases';
import { arrange, copy, kinds, suggest } from '../showcase/data';

export const dynamic = 'force-static';

/** the showcase as Markdown, served at `/showcase.md` and to clients that prefer Markdown */
export function GET() {
  const out = [
    '# Showcase',
    '',
    `> ${copy.header.lead} ${copy.header.title}`,
    '',
    copy.header.summary,
    '',
    `- Suggest yours: ${suggest}`,
    '',
    '## Sites',
    '',
  ];
  // the wall's order: the featured with their own words, Vercel's SDKs, then every other site
  const { featured, shots, blank } = arrange(showcases);
  for (const site of featured) out.push(`- [${site.name}](${site.url}): ${kinds[site.url]}`);
  out.push(`- Vercel: ${copy.vercel}`);
  for (const site of vercel) out.push(`  - [${site.name}](${site.url}): ${kinds[site.url]}`);
  for (const site of [...shots, ...blank]) out.push(`- [${site.name}](${site.url})`);

  out.push('', `## ${copy.blogs.lead} ${copy.blogs.title}`, '');
  for (const site of blogs) out.push(`- [${site.name}](${site.url})`);
  out.push('');
  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
