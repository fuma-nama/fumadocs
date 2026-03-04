import { TemplatePlugin, TemplatePluginContext } from '@/index';
import { depVersions } from '@/constants';
import { pick } from '@/utils';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

export function nextUseTakumi(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      if (this.template.value.startsWith('+next')) {
        return {
          ...packageJson,
          dependencies: {
            ...packageJson.dependencies,
            ...pick(depVersions, ['@takumi-rs/image-response']),
          },
        };
      }
      return packageJson;
    },
    async afterWrite() {
      if (this.template.value.startsWith('+next')) {
        await replaceImports(this);
        await replaceImagePath(this);
        await nextConfigExternal(this);
      }
    },
  };
}

async function replaceImports(context: TemplatePluginContext) {
  const path = join(context.appDir, 'app/og/docs/[...slug]/route.tsx');
  const content = await readFile(path, 'utf-8');
  const replaced = content
    .replaceAll('next/og', '@takumi-rs/image-response')
    .replaceAll('fumadocs-ui/og', 'fumadocs-ui/og/takumi')
    .replace('height: 630,', "height: 630,\n      format: 'webp',");

  await writeFile(path, replaced);
}

async function replaceImagePath(context: TemplatePluginContext) {
  const path = join(context.appDir, 'lib/source.ts');
  const content = await readFile(path, 'utf-8');
  const replaced = content.replaceAll('image.png', 'image.webp');

  await writeFile(path, replaced);
}

async function nextConfigExternal(context: TemplatePluginContext) {
  const path = join(context.dest, 'next.config.mjs');
  const content = await readFile(path, 'utf-8');

  const replaced = content.replace(
    'const config = {',
    `const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],`,
  );

  await writeFile(path, replaced);
}
