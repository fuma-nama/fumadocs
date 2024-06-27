import { Children } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';

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
    `https://api.github.com/repos/${repoOwner}/${repoName}/contributors?per_page=100`,
    { next: { revalidate: 3600 } },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch contributors: ${response.statusText}`);
  }

  const contributors = (await response.json()) as Contributor[];
  return contributors
    .filter((contributor) => !contributor.login.endsWith('[bot]'))
    .sort((a, b) => b.contributions - a.contributions);
}

interface AvatarStackProps {
  children: ReactNode;
  overlap?: number;
}

function AvatarStack({
  children,
  overlap = 16,
}: AvatarStackProps): JSX.Element {
  const childrenArray = Children.toArray(children);

  return (
    <div className="flex items-center">
      {childrenArray.map((child, index) => (
        <div
          key={`avatar-${(child as React.ReactElement<ContributorAvatarProps>).props.contributor.login}`}
          className="relative overflow-hidden rounded-full border"
          style={{
            marginLeft: index === 0 ? '0' : `-${overlap.toString()}px`,
            zIndex: (childrenArray.length - index).toString(),
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

interface ContributorAvatarProps {
  contributor: Contributor;
}

function ContributorAvatar({
  contributor,
}: ContributorAvatarProps): JSX.Element {
  return (
    <Image
      src={contributor.avatar_url}
      alt={`${contributor.login}'s avatar`}
      width={48}
      height={48}
      className="rounded-full border"
    />
  );
}

interface ContributorCounterProps {
  repoOwner: string;
  repoName: string;
  displayCount?: number;
}

export default async function ContributorCounter({
  repoOwner,
  repoName,
  displayCount = 5,
}: ContributorCounterProps): Promise<JSX.Element> {
  const contributors = await fetchContributors(repoOwner, repoName);
  const totalContributors = contributors.length;
  const topContributors = contributors.slice(0, displayCount);

  return (
    <div className="text-center">
      <div className="flex items-center justify-center">
        <AvatarStack>
          {topContributors.map((contributor) => (
            <ContributorAvatar
              key={contributor.login}
              contributor={contributor}
            />
          ))}
        </AvatarStack>
      </div>
      <div className="mt-4 text-sm text-[#a0a0a0]">
        Some of {totalContributors} best contributors
      </div>
    </div>
  );
}
