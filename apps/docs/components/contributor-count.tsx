import type { HTMLAttributes } from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';

interface Contributor {
  avatar_url: string;
  login: string;
  contributions: number;
}

async function fetchContributors(
  repoOwner: string,
  repoName: string,
): Promise<Contributor[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/contributors?per_page=50`,
    { next: { revalidate: 3600 }, cache: 'force-cache' },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch contributors: ${response.statusText}`);
  }

  const contributors = (await response.json()) as Contributor[];
  return contributors
    .filter((contributor) => !contributor.login.endsWith('[bot]'))
    .sort((a, b) => b.contributions - a.contributions);
}

export interface ContributorCounterProps
  extends HTMLAttributes<HTMLDivElement> {
  repoOwner: string;
  repoName: string;
  displayCount?: number;
}

export default async function ContributorCounter({
  repoOwner,
  repoName,
  displayCount = 40,
  ...props
}: ContributorCounterProps): Promise<React.ReactElement> {
  const contributors = await fetchContributors(repoOwner, repoName);
  const topContributors = contributors
    .filter((contributor) => contributor.login !== repoOwner)
    .slice(0, displayCount);

  return (
    <div
      {...props}
      className={cn('flex flex-col items-center gap-4', props.className)}
    >
      <div className="flex flex-row flex-wrap items-center justify-center md:pe-4">
        {topContributors.map((contributor, i) => (
          <a
            key={contributor.login}
            href={`https://github.com/${contributor.login}`}
            rel="noreferrer noopener"
            target="_blank"
            className={cn(
              'size-10 overflow-hidden rounded-full border-4 border-background bg-background md:-mr-4 md:size-12',
            )}
            style={{
              zIndex: topContributors.length - i,
            }}
          >
            <Image
              src={contributor.avatar_url}
              alt={`${contributor.login}'s avatar`}
              width={48}
              height={48}
            />
          </a>
        ))}
        {displayCount < contributors.length ? (
          <div className="size-12 content-center rounded-full bg-secondary text-center">
            +{contributors.length - displayCount}
          </div>
        ) : null}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Some of our best contributors.
      </div>
    </div>
  );
}
