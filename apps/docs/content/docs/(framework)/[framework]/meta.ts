import { type Framework, frameworks } from '@/lib/framework';

export const staticParams = frameworks.map((item) => ({ framework: item.value }));

export default ({ framework }: { framework: Framework }) => ({
  title: frameworks.find((item) => item.value === framework)?.name,
  root: 'framework',
  pages: [
    '---Introduction---',
    'index',
    'what-is-fumadocs',
    'comparisons',
    'manual-installation',
    'upgrade',
    'guides',
    '---Writing---',
    'page-conventions',
    'markdown',
    '---Configurations---',
    'navigation',
    'deploying',
    'internationalization',
    'search',
    '---Integrations---',
    'editor',
    '...integrations',
    'community',
  ],
});
