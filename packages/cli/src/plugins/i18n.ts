import path from 'node:path';
import { Project } from 'ts-morph';
import picocolors from 'picocolors';
import { type Plugin } from '@/commands/add';
import { generated } from '@/generated';
import { transformLayoutConfig } from '@/utils/transform-layout-config';
import { isSrc } from '@/utils/is-src';
import { moveFiles } from '@/utils/move-files';
import { isRelative } from '@/utils/fs';
import { transformSourceI18n } from '@/utils/transform-source-i18n';

export const i18nPlugin: Plugin = {
  files: {
    'lib/i18n.ts': generated['lib/i18n'],
    'middleware.ts': generated.middleware,
  },
  dependencies: [],
  instructions: [
    {
      type: 'text',
      text: `Moved the ./app files to a [lang] route group.
Make sure to update the params of page.tsx and route.ts (if necessary):`,
    },
    {
      type: 'code',
      title: 'page.tsx',
      code: `
export default function Page({
  params,
}: {
  ${picocolors.underline(picocolors.bold('params: { lang: string; slug?: string[] };'))}
})
`.trim(),
    },
    {
      type: 'text',
      text: 'Update the usages to `source` with:',
    },
    {
      type: 'code',
      title: 'page.tsx',
      code: `const page = source.getPage(params.slug, params.lang);`,
    },
    {
      type: 'code',
      title: 'layout.tsx',
      code: `const tree = source.pageTree[params.lang];`,
    },
  ],
  async transform() {
    const src = await isSrc();

    await Promise.all([
      transformLayoutConfig(resolveAppPath('./app/layout.config.tsx', src)),
      transformSourceI18n('./lib/source.ts'),
    ]);

    const project = new Project({
      compilerOptions: {},
    });

    await moveFiles(
      resolveAppPath('./app', src),
      resolveAppPath('./app/[lang]', src),
      (v) => {
        return (
          path.basename(v, path.extname(v)) !== 'layout.config' &&
          !isRelative('./app/api', v)
        );
      },
      project,
    );
  },
};

function resolveAppPath(filePath: string, src: boolean): string {
  return src ? path.join('./src', filePath) : filePath;
}
