import { existsSync } from 'node:fs';
import path from 'node:path';
import type { InstallerPlugin } from 'fuma-cli/registry/installer';
import type { LoadedConfig } from '@/config';

/**
 * `components/ui/*` follow the API of Shadcn UI, reuse the ones the project already has along with its `cn`.
 */
export function pluginReuseUI(config: LoadedConfig, cwd = process.cwd()): InstallerPlugin {
  const { baseDir, aliases } = config;
  const utils = aliases.utils && path.resolve(cwd, baseDir, aliases.utils);

  return {
    beforeInstall(comp) {
      const files = comp.files.filter((file) => {
        if (file.type === 'lib') return !(utils && file.path === 'utils/cn.ts');
        if (file.type !== 'ui') return true;
        return !existsSync(path.resolve(cwd, baseDir, aliases.uiDir, path.basename(file.path)));
      });

      if (files.length === comp.files.length) return;
      // a fully reused component brings no dependencies
      if (files.length === 0) return { ...comp, files, dependencies: {}, devDependencies: {} };
      return { ...comp, files };
    },
    transformImport(specifier, { filePath }) {
      if (!utils || specifier !== 'local:utils/cn.ts') return specifier;
      const relative = path.relative(path.dirname(filePath), utils).replaceAll(path.sep, '/');
      return relative.startsWith('.') ? relative : `./${relative}`;
    },
  };
}
