import { docsLlms, frameworkNote } from '@/lib/llms';
import { source } from '@/lib/source';
import { defaultFramework } from '@/lib/framework';

export const revalidate = false;

export async function GET() {
  const pages: Promise<string>[] = [];
  for (const page of source.getPages()) {
    const framework = page.params?.framework;
    if (page.type === 'docs' && (framework === undefined || framework === defaultFramework))
      pages.push(docsLlms.page(page));
  }

  return new Response(`> ${frameworkNote}\n\n${(await Promise.all(pages)).join('\n\n')}`);
}
