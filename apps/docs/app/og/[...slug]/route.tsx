import { readFileSync } from 'node:fs';
import { generateOGImage } from '@/app/og/[...slug]/og';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { Renderer } from '@takumi-rs/core';

const font = readFileSync('./app/og/[...slug]/JetBrainsMono-Regular.ttf');
const fontBold = readFileSync('./app/og/[...slug]/JetBrainsMono-Bold.ttf');

const renderer = new Renderer();

await renderer.loadFontsAsync([font.buffer, fontBold.buffer]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    renderer,
    primaryTextColor: 'rgb(240,240,240)',
    title: page.data.title,
    description: page.data.description,
  });
}

export function generateStaticParams(): {
  slug: string[];
}[] {
  return source.generateParams().map((page) => ({
    ...page,
    slug: [...page.slug, 'image.png'],
  }));
}
