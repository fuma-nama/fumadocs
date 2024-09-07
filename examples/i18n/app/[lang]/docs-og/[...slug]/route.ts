import { createAPI } from '@/lib/metadata';
import { generateOGImage } from 'fumadocs-ui/src/og';

export const GET = createAPI((page) => {
  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
  });
});
