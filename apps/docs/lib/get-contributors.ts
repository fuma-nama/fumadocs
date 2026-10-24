export interface Contributor {
  avatar_url: string;
  login: string;
  contributions: number;
}

/** every contributor of a repo except bots, most contributions first */
export async function fetchContributors(
  repoOwner: string,
  repoName: string,
  baseUrl: string = 'https://api.github.com',
): Promise<Contributor[]> {
  const headers = new Headers();
  if (process.env.GITHUB_TOKEN) headers.set('Authorization', `Bearer ${process.env.GITHUB_TOKEN}`);

  const contributors: Contributor[] = [];
  for (let page = 1; ; page++) {
    const response = await fetch(
      `${baseUrl}/repos/${repoOwner}/${repoName}/contributors?per_page=100&page=${page}`,
      {
        headers,
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch contributors: ${response.statusText}`);
    }

    const list = (await response.json()) as Contributor[];
    for (const contributor of list) {
      if (!contributor.login.endsWith('[bot]')) contributors.push(contributor);
    }
    if (list.length < 100) break;
  }

  return contributors.sort((a, b) => b.contributions - a.contributions);
}
