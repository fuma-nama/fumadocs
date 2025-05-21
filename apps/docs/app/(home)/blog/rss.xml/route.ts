import { Feed } from 'feed';
import { blog } from '@/lib/source';
import { NextResponse } from 'next/server';

export const revalidate = false;

export function GET() {
  const feed = new Feed({
    title: 'Fumadocs Blog',
    id: 'https://fumadocs.dev',
    link: 'https://fumadocs.dev',
    language: 'en',

    image: 'https://fumadocs.dev/banner.png',
    favicon: 'https://fumadocs.dev/icon.png',
    copyright: 'All rights reserved 2025, Fuma Nama',
  });

  for (const page of blog.getPages()) {
    feed.addItem({
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      link: page.url,
      date: new Date(page.data.date ?? Date.now()),

      author: [
        {
          name: page.data.author,
        },
      ],
    });
  }

  return new NextResponse(feed.rss2());
}
