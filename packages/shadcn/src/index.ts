import path from 'node:path';
import { getManualInstallation } from './manual-installation';
import type { RegistryContext } from './types';

export type {
  GetManualInstallationOptions,
  ManualInstallationSnippet,
} from './manual-installation';

export interface ShadcnRegistryOptions {
  /** file path of `registry.json` */
  registryPath: string;
}

export function createShadcnDocs(options: ShadcnRegistryOptions) {
  const ctx: RegistryContext = {
    registryJsonPath: options.registryPath,
    dir: path.dirname(options.registryPath),
  };

  return {
    getManualInstallation: getManualInstallation.bind(ctx),
  };
}
