import type { Metadata } from 'next';
import { createMetadata } from '@/lib/metadata';
import { Hero } from './sections/hero';
import { Parts } from './sections/parts';
import { Write } from './sections/write';
import { Style } from './sections/style';
import { Batteries } from './sections/batteries';
import { Proof } from './sections/proof';
import { Start } from './sections/start';
import { copy } from './content';

export const metadata: Metadata = createMetadata({
  description: copy.hero.description,
  alternates: {
    types: { 'text/markdown': '/index.md' },
  },
});

export default function Page() {
  return (
    <>
      <Hero />
      <Parts />
      <Write />
      <Style />
      <Batteries />
      <Proof />
      <Start />
    </>
  );
}
