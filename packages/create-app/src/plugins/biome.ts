import { TemplatePlugin } from '@/index';
import { pick, writeFile } from '@/utils';
import path from 'node:path';
import { depVersions } from '@/constants';
import base from './biome.base.json';
import next from './biome.next.json';

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
      const config =
        this.template.value === '+next+fuma-docs-mdx' ? next : base;

      await writeFile(
        path.join(this.dest, 'biome.json'),
        JSON.stringify(config, null, 2),
      );
      this.log('Configured Biome');
    },
  };
}
