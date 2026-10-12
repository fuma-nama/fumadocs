import type { ChangelogEntry } from './index';

export interface GitHubChangelogEntry extends ChangelogEntry {
  prerelease: boolean;
}

export interface GitHubReleasesOptions {
  owner: string;
  repo: string;

  /**
   * GitHub access token, unauthenticated requests are limited to 60 per hour
   */
  token?: string;

  /**
   * Page of releases, starting from 1
   *
   * @defaultValue 1
   */
  page?: number;

  /**
   * Releases per page, up to 100
   *
   * @defaultValue 30
   */
  perPage?: number;

  /**
   * Base URL of GitHub API
   *
   * @defaultValue 'https://api.github.com'
   */
  baseUrl?: string;
}

export interface GitHubReleases {
  entries: GitHubChangelogEntry[];
  /** `undefined` on the last page */
  nextPage?: number;
}

interface Release {
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  html_url: string;
}

/**
 * Get a page of the published releases of a GitHub repository
 */
export async function githubReleases({
  owner,
  repo,
  token,
  page = 1,
  perPage = 30,
  baseUrl = 'https://api.github.com',
}: GitHubReleasesOptions): Promise<GitHubReleases> {
  const headers = new Headers({ accept: 'application/vnd.github+json' });
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(
    `${baseUrl}/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`,
    { headers },
  );
  // GitHub only serves the first 1000 (10000 with a token) releases, deeper pages are empty
  if (res.status === 422) return { entries: [] };
  if (!res.ok) {
    throw new Error(`Failed to fetch releases of ${owner}/${repo}: ${await res.text()}`);
  }

  const entries: GitHubChangelogEntry[] = [];
  for (const release of (await res.json()) as Release[]) {
    if (release.draft) continue;
    // titles name the package of grouped releases, like `create-fumadocs-app@1.0.0` tagged `cli@1.0.0`
    const version = parseVersion(release.name ?? '') ?? parseVersion(release.tag_name);

    entries.push({
      id: release.tag_name,
      title: release.name || release.tag_name,
      date: new Date(release.published_at ?? release.created_at),
      versions: version && [version],
      url: release.html_url,
      content: release.body || undefined,
      prerelease: release.prerelease,
    });
  }

  return {
    entries,
    nextPage: res.headers.get('link')?.includes('rel="next"') ? page + 1 : undefined,
  };
}

function parseVersion(text: string) {
  const match = /^(\S+)@(\d\S*)$/.exec(text);
  if (match) return { name: match[1], version: match[2] };
}
