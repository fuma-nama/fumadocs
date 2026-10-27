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

  // the story's own component: `<Frame />` can't tell the page framing it once it has rendered
  return <StoryNavigation Component={stories[name as keyof typeof stories]._private_.component!} />;
}

export function generateStaticParams() {
  return Object.keys(stories).map((name) => ({ name, path: [] }));
}
