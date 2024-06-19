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
  fileSha: string;

  init?: RequestInit;
}

interface GetBlobReponse {
  content: string;
  encoding: BufferEncoding;
}

export async function getBlob({
  owner,
  repo,
  fileSha,
  token,
  init,
}: GetTreeOptions): Promise<GetBlobReponse> {
  const headers = new Headers(init?.headers);

  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = new URL(
    `/repos/${owner}/${repo}/git/blobs/${fileSha}`,
    'https://api.github.com',
  );

  const res = await fetch(url, {
    ...init,
    headers,
  });
  if (!res.ok)
    throw new Error(
      `failed to get file content from GitHub: ${await res.text()}`,
    );

  return (await res.json()) as GetBlobReponse;
}
