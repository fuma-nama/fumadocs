export interface Contributor {
  avatar_url: string;
  login: string;
  contributions: number;
}

export async function fetchContributors(
  repoOwner: string,
  repoName: string,
  baseUrl: string = 'https://api.github.com',
): Promise<Contributor[]> {
  const headers = new Headers();
  if (process.env.GITHUB_TOKEN)
    headers.set('Authorization', `Bearer ${process.env.GITHUB_TOKEN}`);

  const response = await fetch(
    `${baseUrl}/repos/${repoOwner}/${repoName}/contributors?per_page=50`,
    {
      headers,
      next: { revalidate: 1000 * 1000 },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch contributors: ${response.statusText}`);
  }

  const contributors = (await response.json()) as Contributor[];
  return contributors
    .filter((contributor) => !contributor.login.endsWith('[bot]'))
    .sort((a, b) => b.contributions - a.contributions);
}
