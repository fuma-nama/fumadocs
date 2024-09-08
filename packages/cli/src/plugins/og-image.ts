import picocolors from 'picocolors';
import { generated } from '@/generated';
import { type Plugin } from '@/commands/add';

const { cyanBright, bold, underline } = picocolors;

export const ogImagePlugin: Plugin = {
  files: {
    'lib/metadata.ts': generated['lib/metadata'],
    'app/docs-og/[...slug]/route.tsx': generated['app/docs-og/[...slug]/route'],
  },
  dependencies: [],
  instructions: [
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
      title: 'app/docs/[[...slug]]/page.tsx',
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
