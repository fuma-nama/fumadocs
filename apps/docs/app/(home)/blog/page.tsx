import Link from 'next/link';
import { blog } from '@/lib/source';
import { PathUtils } from 'fumadocs-core/source';
import BannerImage from './banner.png';
import Image from 'next/image';

function getName(path: string) {
  return PathUtils.basename(path, PathUtils.extname(path));
}

export default function Page() {
  const posts = [...blog.getPages()].sort(
    (a, b) =>
      new Date(b.data.date ?? getName(b.path)).getTime() -
      new Date(a.data.date ?? getName(a.path)).getTime(),
  );

  return (
    <main className="mx-auto w-full max-w-fd-container px-4 pb-12 md:py-12">
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
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {posts.map((post) => (
          <Link
            key={post.url}
            href={post.url}
            className="flex flex-col bg-fd-card rounded-2xl border shadow-sm p-4 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <p className="font-medium">{post.data.title}</p>
            <p className="text-sm text-fd-muted-foreground">
              {post.data.description}
            </p>

            <p className="mt-auto pt-4 text-xs text-brand">
              {new Date(post.data.date ?? getName(post.path)).toDateString()}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
