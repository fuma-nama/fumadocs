import { Feed } from 'feed';
import { blogAuthors, blogLoader } from '@/lib/source';
import { getPosts } from '@/lib/blog';
import { NextResponse } from 'next/server';

export const revalidate = false;

const baseUrl = 'https://fumadocs.dev';

export function GET() {
  const feed = new Feed({
    title: 'Fumadocs Blog',
    id: `${baseUrl}/blog`,
    link: `${baseUrl}/blog`,
    language: 'en',

    image: `${baseUrl}/banner.png`,
    favicon: `${baseUrl}/icon.png`,
    copyright: 'All rights reserved 2025, Fuma Nama',
  });

  for (const post of getPosts(blogLoader.getPages(), blogAuthors)) {
    if (!post.date) continue;

    feed.addItem({
      id: post.url,
      title: post.title,
      description: post.description,
      link: `${baseUrl}${post.url}`,
      date: post.date,
      author: post.authors.map((author) => ({ name: author.name, link: author.url })),
    });
  }

  return new NextResponse(feed.rss2());
}
