import { generateOGImage } from 'fumadocs-ui/og';
import { createAPI, generateParams } from '@/lib/metadata';

export const GET = createAPI((page) => {
  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: 'My App',
  });
});

export function generateStaticParams() {
  return generateParams();
}
