import picocolors from 'picocolors';
import { generated } from '@/generated';
import { type Plugin, type PluginContext } from '@/commands/init';
import { exists } from '@/utils/fs';
import { resolveAppPath } from '@/utils/is-src';
import { getOutputPath } from '@/utils/transform-references';

function isI18nEnabled(ctx: PluginContext): Promise<boolean> {
  return exists(getOutputPath('lib/i18n.ts', ctx));
}

export const ogImagePlugin: Plugin = {
  files: async (ctx) => {
    const route = (await isI18nEnabled(ctx))
      ? 'app/[lang]/docs-og/[...slug]/route.tsx'
      : 'app/docs-og/[...slug]/route.tsx';

    return {
      'lib/metadata.ts': generated['lib/metadata'],
      [route]: generated['app/docs-og/[...slug]/route'],
    };
  },
  dependencies: [],
  instructions: (ctx) => [
    {
      type: 'text',
      text: picocolors.cyanBright(picocolors.bold('Import the utils like:')),
    },
    {
      type: 'code',
      title: 'ts',
      code: 'import { metadataImage } from "@/lib/metadata";',
    },
    {
      type: 'text',
      text: picocolors.cyanBright(
        picocolors.bold('Add the images to your metadata:'),
      ),
    },
    {
      type: 'code',
      title: resolveAppPath('app/docs/[[...slug]]/page.tsx', ctx.src),
      code: `
export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug);

  if (!page) notFound();

  ${picocolors.bold(picocolors.underline('return metadataImage.withImage(page.slugs, {'))}
    title: page.data.title,
    description: page.data.description,
  });
}
`.trim(),
    },
  ],
};
