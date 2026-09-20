import type { Registry } from 'fuma-cli/compiler';

/** the UI packages share the same structure */
export function createUIRegistry(
  options: Pick<Registry, 'name' | 'dir' | 'dependencies'>,
): Registry {
  const components: NonNullable<Registry['components']> = {
    accordion: 'components/accordion.tsx',
    banner: 'components/banner.tsx',
    callout: 'components/callout.tsx',
    card: 'components/card.tsx',
    codeblock: 'components/codeblock.tsx',
    files: 'components/files.tsx',
    'github-info': {
      description: 'A card to display GitHub repo info',
      entry: 'components/github-info.tsx',
    },
    heading: 'components/heading.tsx',
    'image-zoom': { description: 'Zoomable Image', entry: 'components/image-zoom.tsx' },
    'inline-toc': 'components/inline-toc.tsx',
    steps: 'components/steps.tsx',
    tabs: 'components/tabs.tsx',
    'type-table': 'components/type-table.tsx',
    'ai/page-actions': {
      description: 'Common page actions',
      entry: 'layouts/shared/page-actions.tsx',
    },
    'layouts/docs': {
      unlisted: true,
      entry: ['layouts/docs/index.tsx', 'layouts/docs/page/index.tsx'],
    },
    'layouts/flux': {
      unlisted: true,
      entry: ['layouts/flux/index.tsx', 'layouts/flux/page/index.tsx'],
    },
    'layouts/notebook': {
      unlisted: true,
      entry: ['layouts/notebook/index.tsx', 'layouts/notebook/page/index.tsx'],
    },
    'layouts/glass': {
      unlisted: true,
      entry: ['layouts/glass/index.tsx', 'layouts/glass/page/index.tsx'],
    },
    'layouts/home': { unlisted: true, entry: 'layouts/home/index.tsx' },
    'layouts/*': { unlisted: true, entry: 'layouts/**/slots/*' },
  };

  return {
    ...options,
    components,
    files: {
      'components/accordion.tsx': { type: 'components', target: '<dir>/accordion/index.tsx' },
      'components/ui/accordion.tsx': { type: 'components', target: '<dir>/accordion/ui.tsx' },
      'components/tabs.tsx': { type: 'components', target: '<dir>/tabs/index.tsx' },
      'components/ui/tabs.tsx': { type: 'components', target: '<dir>/tabs/ui.tsx' },
      'components/sidebar/**': { type: 'components', target: '<dir>/docs-sidebar/*' },
      'components/toc/**': { type: 'components', target: '<dir>/toc/*' },
      'components/ui/*': { type: 'ui' },
      'components/*.css': { type: 'css' },
      'components/{banner,callout,card,codeblock,files,github-info,heading,image-zoom,inline-toc,steps,type-table}.tsx':
        { type: 'components' },
      'utils/{cn,merge-refs,urls}.ts': { type: 'lib' },
      'layouts/shared/page-actions.tsx': {
        type: 'components',
        target: '<dir>/ai/page-actions.tsx',
      },
      'layouts/**/slots/*': { type: 'layout', target: '<dir>/*' },
      'layouts/**': { type: 'layout', target: '<dir>/*', preserve: true },
    },
  };
}
