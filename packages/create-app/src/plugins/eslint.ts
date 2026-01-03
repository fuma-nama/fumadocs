import { TemplatePlugin } from '@/index';
import { pick, writeFile } from '@/utils';
import path from 'node:path';
import { depVersions } from '@/constants';

const config = `import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.source/**',
  ]),
]);

export default eslintConfig;`;

export function eslint(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      if (!this.template.value.startsWith('+next')) return;

      return {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          lint: 'eslint',
        },
        devDependencies: {
          ...packageJson.devDependencies,
          'eslint-config-next': packageJson.dependencies!.next,
          ...pick(depVersions, ['eslint']),
        },
      };
    },
    async afterWrite() {
      if (!this.template.value.startsWith('+next')) return;

      await writeFile(path.join(this.dest, 'eslint.config.mjs'), config);
      this.log('Configured ESLint');
    },
  };
}
