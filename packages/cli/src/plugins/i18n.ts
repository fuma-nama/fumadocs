import path from 'node:path';
import { log } from '@clack/prompts';
import { type Plugin } from '@/commands/init';
import { generated } from '@/generated';
import { transformLayoutConfig } from '@/utils/i18n/transform-layout-config';
import { resolveAppPath } from '@/utils/is-src';
import { moveFiles } from '@/utils/move-files';
import { isRelative } from '@/utils/fs';
import { transformSourceI18n } from '@/utils/i18n/transform-source-i18n';
import { defaultConfig } from '@/config';
import { createEmptyProject } from '@/utils/typescript';
import { transformRootLayout } from '@/utils/i18n/transform-root-layout';
import picocolors from 'picocolors';

export const i18nPlugin: Plugin = {
  files: ({ src }) => ({
    'lib/i18n.ts': generated['lib/i18n'],
    [src ? 'src/middleware.ts' : 'middleware.ts']: generated.middleware,
  }),
  dependencies: [],
  instructions: () => [
    {
      type: 'title',
      text: `1. Update the params of ${picocolors.bold('page.tsx')} and ${picocolors.bold('layout.tsx')}, and make them async if necessary.`,
    },
    {
      type: 'code',
      title: 'layout.tsx',
      code: `
export default async function Layout({
  params,
}: {
  ${picocolors.underline(picocolors.bold('params: Promise<{ lang: string }>'))}
})
`.trim(),
    },
    {
      type: 'code',
      title: 'page.tsx',
      code: `
export default async function Page({
  params,
}: {
  ${picocolors.underline(picocolors.bold('params: Promise<{ lang: string; slug?: string[] }>'))}
})
`.trim(),
    },
    {
      type: 'title',
      text: '2. Update references to your `source` object',
    },
    {
      type: 'text',
      text: 'You can follow the instructions in https://fumadocs.vercel.app/docs/ui/internationalization#source section.',
    },
  ],
  async transform(ctx) {
    const project = createEmptyProject();

    await Promise.all([
      transformLayoutConfig(
        project,
        resolveAppPath('./app/layout.config.tsx', ctx.src),
      ),
      transformRootLayout(project, resolveAppPath('./app/layout.tsx', ctx.src)),
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

    log.success(
      'Moved the ./app files to a [lang] route group, and modified your root layout to add `<I18nProvider />`.',
    );
  },
  transformRejected() {
    log.info(
      `Please create a [lang] route group and move all special files into the folder.
See https://nextjs.org/docs/app/building-your-application/routing/internationalization for more info.`,
    );
  },
};
