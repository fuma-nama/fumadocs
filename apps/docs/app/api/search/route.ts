import { source } from '@/lib/source';
import { flexsearchFromSource } from 'fumadocs-core/search/flexsearch';
import { getSection } from '@/lib/source/navigation';
import { frameworks, isFramework } from '@/lib/framework';

/**
 * Pages are tagged with their frameworks, by themselves (`next`) and with their section (`ui/next`): the search dialog
 * filters by one tag, and a page outside `[framework]` has every framework.
 */
export const { GET } = flexsearchFromSource(source, {
  async buildIndex(page) {
    const section = getSection(page.slugs[0]);
    const framework = page.params?.framework;
    const tags: string[] = [];
    for (const { value } of frameworks) {
      if (isFramework(framework) && framework !== value) continue;
      tags.push(value, `${section}/${value}`);
    }

    return {
      id: page.url,
      url: page.url,
      title: page.data.title ?? '',
      description: page.data.description,
      structuredData:
        typeof page.data.structuredData === 'function'
          ? await page.data.structuredData()
          : page.data.structuredData,
      tag: tags,
    };
  },
});
