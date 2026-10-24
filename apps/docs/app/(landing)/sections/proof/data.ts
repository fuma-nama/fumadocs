import { fetchContributors } from '@/lib/get-contributors';
import { owner, repo } from '@/lib/github';

const revalidate = 86400;

async function getJson<T>(url: string): Promise<T | undefined> {
  const headers = new Headers();
  if (url.startsWith('https://api.github.com') && process.env.GITHUB_TOKEN)
    headers.set('Authorization', `Bearer ${process.env.GITHUB_TOKEN}`);

  const response = await fetch(url, { headers, next: { revalidate } }).catch(() => undefined);
  if (!response?.ok) return;
  return (await response.json().catch(() => undefined)) as T | undefined;
}

export async function getStars(): Promise<number | undefined> {
  const data = await getJson<{ stargazers_count: number }>(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  return data?.stargazers_count;
}

export interface Downloads {
  downloads: number;
  start: string;
  end: string;
}

export function getDownloads(): Promise<Downloads | undefined> {
  return getJson<Downloads>('https://api.npmjs.org/downloads/point/last-week/fumadocs-core');
}

export function getContributorCount(): Promise<number | undefined> {
  return fetchContributors(owner, repo).then(
    (contributors) => contributors.length,
    () => undefined,
  );
}
