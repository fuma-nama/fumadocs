import type { OxlintConfig } from 'oxlint';
import type { TemplatePlugin } from '..';
import { pick } from '@/utils';
import { depVersions } from '@/constants';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const reactVersion = depVersions.react.replace('^', '');

const baseConfig: OxlintConfig & { $schema: string } = {
  $schema: './node_modules/oxlint/configuration_schema.json',
  plugins: ['typescript', 'react', 'import'],
  categories: {},
  env: {
    builtin: true,
  },
  settings: {
    react: {
      version: reactVersion,
    },
    tailwindcss: {
      callees: ['clsx', 'cva', 'cn'],
    },
  },
  ignorePatterns: ['node_modules/', 'dist/'],
};

const nextConfig: OxlintConfig & { $schema: string } = {
  $schema: './node_modules/oxlint/configuration_schema.json',
  plugins: ['typescript', 'react', 'import', 'nextjs'],
  categories: {},
  env: {
    builtin: true,
  },
  settings: {
    react: {
      version: reactVersion,
    },
    tailwindcss: {
      callees: ['clsx', 'cva', 'cn'],
    },
  },
  ignorePatterns: ['node_modules/', 'dist/'],
};

export function oxlint(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      return {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          lint: 'oxlint',
        },
        devDependencies: {
          ...packageJson.devDependencies,
          ...pick(depVersions, ['oxlint']),
        },
      };
    },
    async afterWrite() {
      const config = this.template.value.startsWith('+next') ? nextConfig : baseConfig;

      await writeFile(path.join(this.dest, '.oxlintrc.json'), JSON.stringify(config, null, 2));
      this.log('Configured Oxlint');
    },
  };
}
