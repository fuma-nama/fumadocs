import type { ComponentInstallerPlugin } from '../installer';

/**
 * keep references to `fumadocs-ui/layouts/*` components as original, unless the user is installing them directly.
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
    '@/<dir>/home/index.tsx': 'layouts/home',
    '@/<dir>/shared/index.tsx': 'layouts/shared',
    '@/<dir>/shared/client.tsx': 'layouts/shared',
    '@/<dir>/notebook/index.tsx': 'layouts/notebook',
    '@/<dir>/notebook/client.tsx': 'layouts/notebook',
    '@/<dir>/notebook/page/index.tsx': 'layouts/notebook/page',
    '@/<dir>/notebook/page/client.tsx': 'layouts/notebook/page',
    '@/<dir>/docs/index.tsx': 'layouts/docs',
    '@/<dir>/docs/client.tsx': 'layouts/docs',
    '@/<dir>/docs/page/index.tsx': 'layouts/docs/page',
    '@/<dir>/docs/page/client.tsx': 'layouts/docs/page',
    '@/<dir>/flux/index.tsx': 'layouts/flux',
    '@/<dir>/flux/page/index.tsx': 'layouts/flux/page',
    '@/<dir>/flux/page/client.tsx': 'layouts/flux/page',
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
    transformImport(specifier, { stack }) {
      const isDirectInstall = layoutNameSet.has(stack[0].name);
      // skip if direct install or unrelated to layout component
      if (isDirectInstall || !(specifier in layoutComps)) return specifier;

      return `fumadocs-ui/${layoutComps[specifier]}`;
    },
  };
}
