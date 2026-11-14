import { type Framework, frameworks } from '@/lib/framework';

export const staticParams = frameworks.map((item) => ({ framework: item.value }));

export default ({ framework }: { framework: Framework }) => ({
  title: frameworks.find((item) => item.value === framework)?.name,
  icon: framework,
  root: 'framework',
  pages: [
    '---はじめに---',
    'index',
    'what-is-fumadocs',
    'comparisons',
    'manual-installation',
    'upgrade',
    'guides',
    '---執筆---',
    'page-conventions',
    'markdown',
    '---設定---',
    'navigation',
    'deploying',
    'internationalization',
    'search',
    '---連携---',
    'editor',
    '...integrations',
    'community',
  ],
});
