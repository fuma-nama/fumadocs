import { transformSpecifiers } from '@/utils/ast';
import type { ComponentInstallerPlugin } from '../installer';

/**
 * keep references to `fumadocs-ui/layouts/*` components as original, unless the user is installing them direclty.
 */
export function pluginPreserveLayouts(): ComponentInstallerPlugin {
  const layoutNames = [
    'layouts/home',
    'layouts/flux',
    'layouts/notebook',
    'layouts/docs',
    'layouts/shared',
  ];
  // original specifier -> new specifier
  const layoutComps: Record<string, string> = {
    '@/<dir>/layout/home/index.tsx': 'layouts/home',
    '@/<dir>/layout/shared/index.tsx': 'layouts/shared',
    '@/<dir>/layout/shared/client.tsx': 'layouts/shared',
    '@/<dir>/layout/notebook/index.tsx': 'layouts/notebook',
    '@/<dir>/layout/notebook/client.tsx': 'layouts/notebook',
    '@/<dir>/layout/notebook/page/index.tsx': 'layouts/notebook/page',
    '@/<dir>/layout/notebook/page/client.tsx': 'layouts/notebook/page',
    '@/<dir>/layout/docs/index.tsx': 'layouts/docs',
    '@/<dir>/layout/docs/client.tsx': 'layouts/docs',
    '@/<dir>/layout/docs/page/index.tsx': 'layouts/docs/page',
    '@/<dir>/layout/docs/page/client.tsx': 'layouts/docs/page',
    '@/<dir>/layout/flux/index.tsx': 'layouts/flux',
    '@/<dir>/layout/flux/page/index.tsx': 'layouts/flux/page',
    '@/<dir>/layout/flux/page/client.tsx': 'layouts/flux/page',
  };
  const layoutNameSet = new Set(layoutNames);

  return {
    beforeInstall(comp, { stack }) {
      const isDirectInstall = layoutNameSet.has(stack[0].name);
      if (isDirectInstall) return;

      return {
        ...comp,
        $subComponents: comp.$subComponents.filter((child) => !layoutNameSet.has(child.name)),
      };
    },
    beforeTransform({ parsed, s, stack }) {
      const isDirectInstall = layoutNameSet.has(stack[0].name);
      if (isDirectInstall) return;

      transformSpecifiers(parsed.program, s, (specifier) => {
        // skip if unrelated to layout component
        if (!(specifier in layoutComps)) return specifier;

        return `fumadocs-ui/${layoutComps[specifier]}`;
      });
    },
  };
}
