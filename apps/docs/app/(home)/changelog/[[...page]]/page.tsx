import { notFound } from 'next/navigation';
import { githubReleases } from '@fumadocs/changelog/github';
import { ChangelogPagination, ChangelogTimeline } from '@/components/changelog';
import { createMetadata } from '@/lib/metadata';

export const revalidate = 3600;

export const metadata = createMetadata({
  title: 'Changelog',
  description: 'The latest releases of Fumadocs',
  openGraph: {
    url: 'https://fumadocs.dev/changelog',
  },
});

export default async function Page(props: PageProps<'/changelog/[[...page]]'>) {
  const { page: segments = [] } = await props.params;
  const page = segments.length === 0 ? 1 : Number(segments[0]);
  if (segments.length > 1 || !Number.isInteger(page) || page < 1) notFound();

  const { entries, nextPage } = await githubReleases({
    owner: 'fuma-nama',
    repo: 'fumadocs',
    token: process.env.GITHUB_TOKEN,
    page,
  });
  if (entries.length === 0) notFound();

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold">Changelog</h1>
      <p className="mb-4 text-fd-muted-foreground">The latest releases of Fumadocs.</p>
      <ChangelogTimeline entries={entries} />
      <ChangelogPagination
        newer={page > 1 ? getPageUrl(page - 1) : undefined}
        older={nextPage ? getPageUrl(nextPage) : undefined}
        className="mt-10"
      />
    </div>
  );
}

function getPageUrl(page: number) {
  return page === 1 ? '/changelog' : `/changelog/${page}`;
}

export function generateStaticParams() {
  return [{ page: [] }];
}
