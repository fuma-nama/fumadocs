import type { Metadata } from 'next';
import { createMetadata } from '@/lib/metadata';
import { Hero } from './sections/hero';
import { Style } from './sections/style';
import { Write } from './sections/write';
import { Parts } from './sections/parts';
import { Integrations } from './sections/integrations';
import { Cli } from './sections/cli';
import { Proof } from './sections/proof';
import { Start } from './sections/start';
import { copy } from './content';

export const metadata: Metadata = createMetadata({
  description: `${copy.hero.lead} ${copy.hero.description}`,
  alternates: {
    types: { 'text/markdown': '/index.md' },
  },
});

export default function Page() {
  return (
    <>
      <Hero />
      <Style />
      <Write />
      <Parts />
      <Integrations />
      <Cli />
      <Proof />
      <Start />
    </>
  );
}
