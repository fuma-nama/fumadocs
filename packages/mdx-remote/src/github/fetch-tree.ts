export interface FetchTreeOptions {
  owner: string;
  repo: string;

  /**
   * GitHub access token
   */
  accessToken?: string;

  /**
   * The SHA1 value or ref (branch or tag) name of the tree.
   */
  treeSha: string;

  /**
   *
   * Setting this parameter to any value returns the objects or subtrees referenced by the tree specified in :tree_sha
   * @defaultValue `false`
   */
  recursive?: boolean;

  init?: RequestInit;
}

export interface GitTreeResponse {
  sha: string;
  url: string;
  truncated: boolean;
  tree: (
    | {
        type: 'blob';
        path: string;
        sha: string;
        url: string;
      }
    | {
        type: 'tree';
        path: string;
        sha: string;
        url: string;
      }
  )[];
}

export async function fetchTree({
  owner,
  repo,
  treeSha,
  recursive = false,
  accessToken,
  init,
}: FetchTreeOptions): Promise<GitTreeResponse> {
  const headers = new Headers(init?.headers);

  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const url = new URL(
    `/repos/${owner}/${repo}/git/trees/${treeSha}`,
    'https://api.github.com',
  );
  if (recursive) url.searchParams.set('recursive', String(recursive));

  const res = await fetch(url, {
    ...init,
    headers,
  });
  if (!res.ok)
    throw new Error(`failed to get file tree from GitHub: ${await res.text()}`);

  return (await res.json()) as GitTreeResponse;
}
