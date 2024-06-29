interface FetchBlobOptions {
  url: string;

  /**
   * GitHub access token
   */
  accessToken?: string;

  init?: RequestInit;
}

interface FetchBlobResponse {
  content: string;
  encoding: BufferEncoding;
}

/**
 * Fetch content of blob, result will be converted to utf-8
 */
export async function fetchBlob({
  url,
  accessToken,
  init,
}: FetchBlobOptions): Promise<FetchBlobResponse> {
  const headers = new Headers(init?.headers);

  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(url, {
    ...init,
    headers,
  });
  if (!res.ok)
    throw new Error(
      `failed to get file content from GitHub: ${await res.text()}`,
    );

  const blob = (await res.json()) as FetchBlobResponse;
  return {
    encoding: 'utf8',
    content: Buffer.from(blob.content, blob.encoding).toString('utf8'),
  };
}
