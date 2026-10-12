import Image from 'next/image';
import Link from 'fumadocs-core/link';
import { TagsIcon } from 'lucide-react';
import { blogAuthors, blogLoader } from '@/lib/source';
import { getPosts } from '@/lib/blog';
import { BlogCards } from '@/components/blog';
import BannerImage from './banner.png';

export default function Page() {
  const posts = getPosts(blogLoader.getPages(), blogAuthors);

  return (
    <div className="mx-auto w-full max-w-page px-4 pb-12 md:py-12">
      <div className="relative dark mb-4 aspect-[3.2] p-8 z-2 md:p-12">
        <Image
          src={BannerImage}
          priority
          alt="banner"
          className="absolute inset-0 size-full -z-1 object-cover"
        />
        <h1 className="mb-4 text-3xl text-landing-foreground font-mono font-medium">
          Fumadocs Blog
        </h1>
        <p className="text-sm font-mono text-landing-foreground-200">
          Latest announcements of Fumadocs.
        </p>
        <Link
          href="/blog/tags"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border bg-fd-secondary/50 px-3 py-1.5 text-sm font-mono text-landing-foreground transition-colors hover:bg-fd-accent"
        >
          <TagsIcon className="size-4" />
          All Tags
        </Link>
      </div>
      <BlogCards posts={posts} />
    </div>
  );
}
