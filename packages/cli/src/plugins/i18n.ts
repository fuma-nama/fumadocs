import path from 'node:path';
import picocolors from 'picocolors';
import { type Plugin } from '@/commands/init';
import { generated } from '@/generated';
import { transformLayoutConfig } from '@/utils/transform-layout-config';
import { resolveAppPath } from '@/utils/is-src';
import { moveFiles } from '@/utils/move-files';
import { isRelative } from '@/utils/fs';
import { transformSourceI18n } from '@/utils/transform-source-i18n';
import { defaultConfig } from '@/config';
import { createEmptyProject } from '@/utils/typescript';

export const i18nPlugin: Plugin = {
  files: () => ({
    'lib/i18n.ts': generated['lib/i18n'],
    'middleware.ts': generated.middleware,
  }),
  dependencies: [],
  instructions: () => [
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
      code: `const page = source.getPage(params.slug, params.lang);
const pages = source.getPage(params.lang);`,
    },
    {
      type: 'code',
      title: 'layout.tsx',
      code: `const tree = source.pageTree[params.lang];`,
    },
  ],
  async transform(ctx) {
    const project = createEmptyProject();

    await Promise.all([
      transformLayoutConfig(
        project,
        resolveAppPath('./app/layout.config.tsx', ctx.src),
      ),
      transformSourceI18n(
        project,
        path.join(
          ctx.aliases?.libDir ?? defaultConfig.aliases.libDir,
          'source.ts',
        ),
        ctx,
      ),
    ]);

    await moveFiles(
      resolveAppPath('./app', ctx.src),
      resolveAppPath('./app/[lang]', ctx.src),
      (v) => {
        return (
          path.basename(v, path.extname(v)) !== 'layout.config' &&
          !isRelative('./app/api', v)
        );
      },
      project,
      ctx.src,
    );
  },
};
