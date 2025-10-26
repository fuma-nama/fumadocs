import { TemplatePlugin } from '@/index';
import { copy, pick } from '@/utils';
import path from 'node:path';
import { depVersions, sourceDir } from '@/constants';

export function biome(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      return {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          lint: 'biome check',
          format: 'biome format --write',
        },
        devDependencies: {
          ...packageJson.devDependencies,
          ...pick(depVersions, ['@biomejs/biome']),
        },
      };
    },
    async afterWrite() {
      await copy(path.join(sourceDir, `template/+next+biome`), this.dest);
      this.log('Configured Biome');
    },
  };
}
