import { TemplatePlugin, TemplatePluginContext } from '@/index';
import { depVersions } from '@/constants';
import { pick } from '@/utils';
import { join } from 'node:path';
import fs from 'node:fs/promises';

export function ogImage(type: 'next-og' | 'takumi'): TemplatePlugin {
  return {
    packageJson(packageJson) {
      if (this.template.value.startsWith('+next') && type === 'takumi') {
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
      if (this.template.value.startsWith('+next') && type === 'takumi') {
        await replaceImports(this);
        await replaceImagePath(this);
        await nextConfigExternal(this);
      }
    },
  };
}

async function replaceImports(context: TemplatePluginContext) {
  const path = join(context.appDir, 'app/og/docs/[...slug]/route.tsx');
  const content = await fs.readFile(path, 'utf-8');

  const replaced = content
    .replace('next/og', '@takumi-rs/image-response')
    .replace('height: 630,', "height: 630,\n      format: 'webp',");

  await fs.writeFile(path, replaced);
}

async function replaceImagePath(context: TemplatePluginContext) {
  const path = join(context.appDir, 'lib/source.ts');
  const content = await fs.readFile(path, 'utf-8');

  const replaced = content.replace('image.png', 'image.webp');

  await fs.writeFile(path, replaced);
}

async function nextConfigExternal(context: TemplatePluginContext) {
  const path = join(context.appDir, 'next.config.mjs');
  const content = await fs.readFile(path, 'utf-8');

  const replaced = content.replace(
    'const config = {',
    `const config = {
  servwerExternalPackages: ['@takumi-rs/image-response'],
  `,
  );

  await fs.writeFile(path, replaced);
}
