type Response = {
  commit: {
    committer: {
      date: string;
    };
  };
}[];

export interface GetGithubLastCommitOptions {
  /**
   * Repository name, like "fumadocs"
   */
  repo: string;

  /** Owner of repository */
  owner: string;

  /**
   * Path to file
   */
  path: string;

  /**
   * GitHub access token
   */
  token?: string;

  /**
   * SHA or ref (branch or tag) name.
   */
  sha?: string;

  /**
   * Custom query parameters
   */
  params?: Record<string, string>;

  options?: RequestInit;
}

/**
 * Get the last edit time of a file using GitHub API
 *
 * By default, this will cache the result forever.
 * Set `options.next.revalidate` to customise this.
 */
export async function getGithubLastEdit({
  repo,
  token,
  owner,
  path,
  sha,
  options = {},
  params: customParams = {},
}: GetGithubLastCommitOptions): Promise<Date | null> {
  const headers = new Headers(options.headers);
  const params = new URLSearchParams();
  params.set('path', path);
  params.set('page', '1');
  params.set('per_page', '1');

  if (sha) params.set('sha', sha);

  for (const [key, value] of Object.entries(customParams)) {
    params.set(key, value);
  }

  if (token) {
    headers.append('authorization', token);
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?${params.toString()}`,
    {
      cache: 'force-cache',
      ...options,
      headers,
    },
  );

  if (!res.ok)
    throw new Error(
      `Failed to fetch last edit time from Git ${await res.text()}`,
    );
  const data = (await res.json()) as Response;

  if (data.length === 0) return null;
  return new Date(data[0].commit.committer.date);
}
