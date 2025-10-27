import { TemplatePlugin } from '@/index';
import { pick, writeFile } from '@/utils';
import path from 'node:path';
import { depVersions } from '@/constants';

const config = `import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      '.source/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;`;

export function eslint(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      if (this.template.value !== '+next+fuma-docs-mdx') return;

      return {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          lint: 'eslint',
        },
        devDependencies: {
          ...packageJson.devDependencies,
          'eslint-config-next': packageJson.dependencies!.next,
          ...pick(depVersions, ['eslint', '@eslint/eslintrc']),
        },
      };
    },
    async afterWrite() {
      if (this.template.value !== '+next+fuma-docs-mdx') return;

      await writeFile(path.join(this.dest, 'eslint.config.mjs'), config);
      this.log('Configured ESLint');
    },
  };
}
