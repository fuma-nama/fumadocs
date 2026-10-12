import Link from 'fumadocs-core/link';
import { Image } from 'fumadocs-core/framework';
import type { TOCItemType } from 'fumadocs-core/toc';
import { TOCProvider } from 'fumadocs-ui/components/toc';
import { ChevronLeftIcon, ChevronRightIcon, CornerLeftUpIcon, TagIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BlogAuthor, BlogPost, BlogTag } from '@/lib/blog';
import { BlogPanel } from './panel';

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export function BlogCards({
  posts,
  className,
  ...props
}: ComponentProps<'div'> & { posts: BlogPost[] }) {
  return (
    <div
      {...props}
      className={cn('grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4', className)}
    >
      {posts.map((post) => (
        <BlogCard key={post.url} post={post} />
      ))}
    </div>
  );
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={post.url}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-fd-card shadow-sm transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      {post.image && (
        <Image
          src={post.image}
          alt=""
          width={1200}
          height={630}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-medium">{post.title}</p>
        <p className="text-sm text-fd-muted-foreground empty:hidden">{post.description}</p>
        <div className="mt-auto flex flex-row items-center pt-4">
          {post.authors.map(
            (author) =>
              author.image && (
                <Image
                  key={author.name}
                  src={author.image}
                  alt={author.name}
                  title={author.name}
                  width={24}
                  height={24}
                  className="-ms-2 size-6 rounded-full border-2 border-fd-card first:ms-0 group-hover:border-fd-accent"
                />
              ),
          )}
          {post.date && <BlogDate date={post.date} className="ms-auto text-xs text-fd-primary" />}
        </div>
      </div>
    </Link>
  );
}

export interface BlogPageProps extends ComponentProps<'article'> {
  /** shows a floating panel with the table of contents */
  toc?: TOCItemType[];
}

export function BlogPage({ toc, className, ...props }: BlogPageProps) {
  const article = (
    <article
      {...props}
      className={cn(
        'mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 py-8',
        // room for the panel
        toc && 'pb-24',
        className,
      )}
    />
  );
  if (!toc) return article;

  return (
    <TOCProvider toc={toc}>
      {article}
      <BlogPanel />
    </TOCProvider>
  );
}

/** the card on top of blog pages */
export function BlogHeader(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col items-start gap-4 border-y bg-fd-card px-4 pt-3.5 pb-6 text-fd-card-foreground shadow-inner max-sm:-mx-4 sm:rounded-xl sm:border',
        props.className,
      )}
    />
  );
}

export function BlogBackLink({ children = 'Back to Blog', ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        'inline-flex items-center gap-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground',
        props.className,
      )}
    >
      <CornerLeftUpIcon className="size-3.5" />
      {children}
    </Link>
  );
}

export function BlogTitle(props: ComponentProps<'h1'>) {
  return <h1 {...props} className={cn('text-2xl font-semibold', props.className)} />;
}

export function BlogDescription(props: ComponentProps<'p'>) {
  return <p {...props} className={cn('text-fd-muted-foreground empty:hidden', props.className)} />;
}

export function BlogAuthors({
  authors,
  className,
  ...props
}: ComponentProps<'div'> & { authors: BlogAuthor[] }) {
  return (
    <div {...props} className={cn('flex flex-row flex-wrap gap-x-6 gap-y-2', className)}>
      {authors.map((author) => {
        const content = (
          <>
            {author.image && (
              <Image
                src={author.image}
                alt=""
                width={28}
                height={28}
                className="size-7 rounded-full"
              />
            )}
            <span className="flex flex-col leading-tight">
              <span className="font-medium">{author.name}</span>
              {author.title && (
                <span className="text-xs text-fd-muted-foreground">{author.title}</span>
              )}
            </span>
          </>
        );

        return author.url ? (
          <a
            key={author.name}
            href={author.url}
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-fd-primary"
          >
            {content}
          </a>
        ) : (
          <span key={author.name} className="inline-flex items-center gap-2 text-sm">
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function BlogTags({
  tags,
  className,
  ...props
}: ComponentProps<'div'> & { tags: BlogTag[] }) {
  if (tags.length === 0) return;

  return (
    <div {...props} className={cn('flex flex-row flex-wrap items-center gap-2', className)}>
      <TagIcon className="size-4 text-fd-muted-foreground" />
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={tag.url}
          className="rounded-lg bg-fd-primary px-1.5 py-0.5 font-mono text-sm text-fd-primary-foreground"
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}

export function BlogDate({
  date,
  ...props
}: Omit<ComponentProps<'time'>, 'children'> & { date: Date | string }) {
  const value = new Date(date);

  return (
    <time dateTime={value.toISOString()} {...props}>
      {dateFormat.format(value)}
    </time>
  );
}

/** adds typography styles */
export function BlogBody(props: ComponentProps<'div'>) {
  return <div {...props} className={cn('prose min-w-0', props.className)} />;
}

/** links to the newer and older posts */
export function BlogPostNav({
  newer,
  older,
  className,
  ...props
}: ComponentProps<'nav'> & { newer?: BlogPost; older?: BlogPost }) {
  if (!newer && !older) return;

  return (
    <nav {...props} className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {newer && (
        <PostLink post={newer}>
          <ChevronLeftIcon className="size-3.5 rtl:rotate-180" />
          Newer post
        </PostLink>
      )}
      {older && (
        <PostLink post={older} className="sm:col-start-2 sm:items-end">
          Older post
          <ChevronRightIcon className="size-3.5 rtl:rotate-180" />
        </PostLink>
      )}
    </nav>
  );
}

function PostLink({
  post,
  className,
  children,
}: {
  post: BlogPost;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={post.url}
      className={cn(
        'flex flex-col gap-1 rounded-xl border bg-fd-card p-4 text-fd-card-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 text-xs text-fd-muted-foreground">
        {children}
      </span>
      <span className="font-medium">{post.title}</span>
    </Link>
  );
}

/** tags with their number of posts, see `getTags()` */
export function BlogTagCards({
  tags,
  className,
  ...props
}: ComponentProps<'div'> & { tags: (BlogTag & { count: number })[] }) {
  return (
    <div
      {...props}
      className={cn(
        'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6',
        className,
      )}
    >
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={tag.url}
          className="flex flex-row items-center gap-2 rounded-lg border bg-fd-card px-2 py-1 font-mono text-fd-card-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          <TagIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
          <span className="font-medium">{tag.name}</span>
          <span className="ms-auto text-sm text-fd-muted-foreground">{tag.count}</span>
        </Link>
      ))}
    </div>
  );
}
