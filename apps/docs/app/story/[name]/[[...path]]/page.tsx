import '../../frame.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import * as stories from '@/content/docs/ui/layouts/layouts.story';
import { StoryNavigation } from './navigation';

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function Page(props: PageProps<'/story/[name]/[[...path]]'>) {
  const { name } = await props.params;
  if (!(name in stories)) notFound();
  const { Frame } = stories[name as keyof typeof stories];

  return (
    <>
      <Frame />
      <StoryNavigation />
    </>
  );
}

export function generateStaticParams() {
  return Object.keys(stories).map((name) => ({ name, path: [] }));
}
