import picocolors from 'picocolors';
import { generated } from '@/generated';
import { type Plugin } from '@/commands/add';
import { exists } from '@/utils/fs';
import { resolveAppPath } from '@/utils/is-src';

const { cyanBright, bold, underline } = picocolors;

function isI18nEnabled(src: boolean): Promise<boolean> {
  return exists(resolveAppPath('./lib/i18n.ts', src));
}

export const ogImagePlugin: Plugin = {
  files: async (src) => {
    const route = (await isI18nEnabled(src))
      ? 'app/[lang]/docs-og/[...slug]/route.tsx'
      : 'app/docs-og/[...slug]/route.tsx';

    return {
      'lib/metadata.ts': generated['lib/metadata'],
      [route]: generated['app/docs-og/[...slug]/route'],
    };
  },
  dependencies: [],
  instructions: (src) => [
    {
      type: 'text',
      text: cyanBright(bold('Import the utils like:')),
    },
    {
      type: 'code',
      title: 'ts',
      code: 'import { metadataImage } from "@/lib/metadata";',
    },
    {
      type: 'text',
      text: cyanBright(bold('Add the images to your metadata:')),
    },
    {
      type: 'code',
      title: resolveAppPath('app/docs/[[...slug]]/page.tsx', src),
      code: `
export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = source.getPage(params.slug);

  if (!page) notFound();

  ${bold(underline('return metadataImage.withImage({'))}
    title: page.data.title,
    description: page.data.description,
  });
}
`.trim(),
    },
  ],
};
