import { metadataImage } from '@/lib/metadata';
import { createRenderer, generateOGImage } from 'fumadocs-ui/og';

const renderer = createRenderer();

export const GET = metadataImage.createAPI((page) => {
  return generateOGImage({
    renderer,
    title: page.data.title,
    description: page.data.description,
  });
});
