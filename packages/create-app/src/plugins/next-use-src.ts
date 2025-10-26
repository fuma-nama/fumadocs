import { TemplatePlugin } from '@/index';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Use `src` for app directory
 */
export function nextUseSrc(): TemplatePlugin {
  return {
    template(info) {
      if (info.value !== '+next+fuma-docs-mdx') return;

      return {
        ...info,
        appDir: 'src',
        rename: (file) => {
          if (
            path.basename(file) === 'mdx-components.tsx' ||
            isRelative(path.join(this.dest, 'app'), file) ||
            isRelative(path.join(this.dest, 'lib'), file)
          ) {
            return path.join(this.dest, 'src', path.relative(this.dest, file));
          }

          return file;
        },
      };
    },
    // update tsconfig.json for src dir
    async afterWrite() {
      if (this.template.value !== '+next+fuma-docs-mdx') return;

      const tsconfigPath = path.join(this.dest, 'tsconfig.json');
      const content = (await fs.readFile(tsconfigPath)).toString();
      const config = JSON.parse(content);

      if (config.compilerOptions?.paths) {
        Object.assign(config.compilerOptions.paths, {
          '@/*': ['./src/*'],
        });
      }

      await fs.writeFile(tsconfigPath, JSON.stringify(config, null, 2));
    },
  };
}

function isRelative(dir: string, file: string) {
  return !path.relative(dir, file).startsWith(`..${path.sep}`);
}
