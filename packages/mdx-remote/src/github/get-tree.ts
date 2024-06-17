interface GetTreeOptions {
  owner: string;
  repo: string;

  /**
   * GitHub access token
   */
  token?: string;

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

interface GetTreeResponse {
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

export async function getTree({
  owner,
  repo,
  treeSha,
  recursive,
  token,
  init,
}: GetTreeOptions): Promise<GetTreeResponse> {
  const headers = new Headers(init?.headers);

  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (token) headers.set('Authorization', `Bearer ${token}`);

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
    throw new Error(
      `failed to get file content from GitHub: ${await res.text()}`,
    );

  return (await res.json()) as GetTreeResponse;
}
