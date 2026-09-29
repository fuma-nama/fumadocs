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
        rename: (file) => {
          if (
            isRelative(path.join(this.dest, 'app'), file) ||
            isRelative(path.join(this.dest, 'lib'), file) ||
            isRelative(path.join(this.dest, 'components'), file) ||
            isRootConventionFile(this.dest, file)
          ) {
            return path.join(this.dest, 'src', path.relative(this.dest, file));
          }

          return file;
        },
      };
    },
    // update tsconfig.json for src dir
    async afterWrite() {
      if (!this.template.value.startsWith('+next')) return;

      const tsconfigPath = path.join(this.dest, 'tsconfig.json');
      const content = await fs.readFile(tsconfigPath, 'utf-8');
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

/**
 * Next.js only reads these files from the same level as `app`, so they must move into `src` too.
 */
const rootConventionFiles = ['proxy', 'middleware', 'instrumentation', 'instrumentation-client'];

function isRootConventionFile(dest: string, file: string) {
  const relative = path.relative(dest, file);
  if (relative.includes(path.sep)) return false;

  return rootConventionFiles.includes(relative.replace(/\.(ts|js|mts|mjs)$/, ''));
}

function isRelative(dir: string, file: string) {
  return !path.relative(dir, file).startsWith(`..${path.sep}`);
}
