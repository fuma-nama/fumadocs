import { TemplatePlugin } from '@/index';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Use `src` for app directory
 */
export function nextUseSrc(): TemplatePlugin {
  return {
    template(info) {
      if (!info.value.startsWith('+next')) return;

      return {
        ...info,
        appDir: 'src',
      };
    },
    write(file) {
      const filePath = file.filePath;

      if (
        path.basename(filePath) === 'mdx-components.tsx' ||
        isRelative(path.join(this.dest, 'app'), filePath) ||
        isRelative(path.join(this.dest, 'lib'), filePath) ||
        isRelative(path.join(this.dest, 'components'), filePath)
      ) {
        file.filePath = path.join(this.dest, 'src', path.relative(this.dest, filePath));
      }

      return file;
    },
    // update tsconfig.json for src dir
    async afterWrite() {
      if (!this.template.value.startsWith('+next')) return;

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
