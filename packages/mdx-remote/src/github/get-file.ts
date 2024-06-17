interface GetFileOptions {
  owner: string;
  repo: string;
  path: string;

  /**
   * GitHub access token
   */
  token?: string;

  init?: RequestInit;
}

interface Response {
  type: 'file';
  content: string;
  sha: string;
}

export async function getFile({
  owner,
  repo,
  path,
  token,
  init,
}: GetFileOptions): Promise<Response> {
  const headers = new Headers(init?.headers);

  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      ...init,
      headers,
    },
  );
  if (!res.ok)
    throw new Error(
      `failed to get file content from GitHub: ${await res.text()}`,
    );

  return (await res.json()) as Response;
}
