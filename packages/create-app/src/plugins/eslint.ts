import { TemplatePlugin } from '@/create-app';
import { copy } from '@/utils';
import path from 'node:path';
import { depVersions, sourceDir } from '@/constants';

export function eslint(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      return {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          lint: 'eslint',
        },
        devDependencies: {
          ...packageJson.devDependencies,
          eslint: '^9',
          'eslint-config-next': depVersions.next,
          '@eslint/eslintrc': '^3',
        },
      };
    },
    async afterWrite() {
      await copy(path.join(sourceDir, `template/+next+eslint`), this.dest);
      this.log('Configured ESLint');
    },
  };
}
