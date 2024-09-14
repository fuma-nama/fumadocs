import { createAPI } from '@/lib/metadata';
import { generateOGImage } from 'fumadocs-ui/og';

export const GET = createAPI((page) => {
  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
  });
});
