import { cacheLife } from 'next/cache';
import { fetchContributors } from '@/lib/get-contributors';
import { owner, repo } from '@/lib/github';

async function getJson<T>(url: string): Promise<T | undefined> {
  'use cache';
  cacheLife({ revalidate: 86400 });
  const headers = new Headers();
  if (url.startsWith('https://api.github.com') && process.env.GITHUB_TOKEN)
    headers.set('Authorization', `Bearer ${process.env.GITHUB_TOKEN}`);

  const response = await fetch(url, { headers }).catch(() => undefined);
  if (!response?.ok) return;
  return (await response.json().catch(() => undefined)) as T | undefined;
}

export async function getStars(): Promise<number | undefined> {
  const data = await getJson<{ stargazers_count: number }>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  return data?.stargazers_count;
}

export async function getDownloads(): Promise<number | undefined> {
  const data = await getJson<{ downloads: number }>(
    'https://api.npmjs.org/downloads/point/last-week/fumadocs-core',
  );
  return data?.downloads;
}

export async function getContributorCount(): Promise<number | undefined> {
  'use cache';
  cacheLife({ revalidate: 86400 });
  return fetchContributors(owner, repo).then(
    (contributors) => contributors.length,
    () => undefined,
  );
}
