import type { InstallerPlugin } from 'fuma-cli/registry/installer';

/**
 * keep references to `fumadocs-ui/layouts/*` components as original, unless the user is installing them directly.
 */
export function pluginPreserveLayouts(): InstallerPlugin {
  const layoutNames = [
    'layouts/home',
    'layouts/flux',
    'layouts/notebook',
    'layouts/docs',
    'layouts/shared',
  ];
  // original specifier -> new specifier
  const layoutComps: Record<string, string> = {
    'local:<dir>/home/index.tsx': 'layouts/home',
    'local:<dir>/shared/index.tsx': 'layouts/shared',
    'local:<dir>/shared/client.tsx': 'layouts/shared',
    'local:<dir>/notebook/index.tsx': 'layouts/notebook',
    'local:<dir>/notebook/client.tsx': 'layouts/notebook',
    'local:<dir>/notebook/page/index.tsx': 'layouts/notebook/page',
    'local:<dir>/notebook/page/client.tsx': 'layouts/notebook/page',
    'local:<dir>/docs/index.tsx': 'layouts/docs',
    'local:<dir>/docs/client.tsx': 'layouts/docs',
    'local:<dir>/docs/page/index.tsx': 'layouts/docs/page',
    'local:<dir>/docs/page/client.tsx': 'layouts/docs/page',
    'local:<dir>/flux/index.tsx': 'layouts/flux',
    'local:<dir>/flux/page/index.tsx': 'layouts/flux/page',
    'local:<dir>/flux/page/client.tsx': 'layouts/flux/page',
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
