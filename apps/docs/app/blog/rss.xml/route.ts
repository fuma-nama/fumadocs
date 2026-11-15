import { Feed } from 'feed';
import { blogAuthors, blogLoader } from '@/lib/source';
import { getPosts } from '@/lib/blog';
import { NextResponse } from 'next/server';
import { cacheLife } from 'next/cache';

const baseUrl = 'https://fumadocs.dev';

export async function GET() {
  return new NextResponse(await rss());
}

// `Feed` stamps the current time, the cache lets the feed prerender
async function rss(): Promise<string> {
  'use cache';
  cacheLife({ revalidate: Infinity });
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

  return feed.rss2();
}
