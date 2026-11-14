import { type Framework, frameworks } from '@/lib/framework';

export const staticParams = frameworks.map((item) => ({ framework: item.value }));

export default ({ framework }: { framework: Framework }) => ({
  title: frameworks.find((item) => item.value === framework)?.name,
  icon: framework,
  root: 'framework',
  pages: [
    '---簡介---',
    'index',
    'what-is-fumadocs',
    'comparisons',
    'manual-installation',
    'upgrade',
    'guides',
    '---撰寫---',
    'page-conventions',
    'markdown',
    '---設定---',
    'navigation',
    'deploying',
    'internationalization',
    'search',
    '---整合---',
    'editor',
    '...integrations',
    'community',
  ],
});
