import {
  getManualInstallation,
  type ManualInstallationSnippet,
  type GetManualInstallationOptions,
} from './manual-installation';

export type {
  GetManualInstallationOptions,
  ManualInstallationSnippet,
} from './manual-installation';

export interface ShadcnRegistryOptions {
  /** file path of `registry.json` */
  registryPath: string;
}

export function createShadcnDocs(options: ShadcnRegistryOptions) {
  return {
    getManualInstallation(
      installOptions: GetManualInstallationOptions,
    ): Promise<ManualInstallationSnippet[]> {
      return getManualInstallation(options, installOptions);
    },
  };
}
