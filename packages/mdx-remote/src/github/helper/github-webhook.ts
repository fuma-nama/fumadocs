import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

interface GithubWebhookMessage {
  ref: string;
  before: string;
  after: string;
}

export function createGithubWebhookAPI({
  ref = process.env.VERCEL_GIT_COMMIT_REF,
  secret,
  paths = [
    { path: '/docs/[[...slug]]', type: 'page' },
    { path: '/docs', type: 'layout' },
  ],
}: {
  /**
   * Git branch to listen/revalidate.
   *
   * When not specified, find one from environment variables. Otherwise, listen to all refs.
   */
  ref?: string;
  secret?: string;

  /**
   * paths to revalidate docs
   *
   * @defaultValue '/docs/[[...slug]]' and '/docs'
   */
  paths?: { path: string; type: 'page' | 'layout' }[];
}): {
  POST: (next: NextRequest) => Promise<Response>;
} {
  const encoder = new TextEncoder();

  return {
    async POST(request) {
      const body = await request.text();

      if (secret) {
        const signature = request.headers.get('x-hub-signature-256');

        if (!signature || !(await verifySignature(signature, body))) {
          return new Response('Unauthorized', { status: 401 });
        }
      }

      const githubEvent = request.headers.get('x-github-event');

      if (githubEvent === 'push') {
        const data = JSON.parse(body) as GithubWebhookMessage;

        if (ref === undefined || data.ref === `refs/heads/${ref}`) {
          for (const path of paths) {
            revalidatePath(path.path, path.type);
          }
        }
      }

      return new NextResponse('Accepted', { status: 202 });
    },
  };

  // from GitHub example
  async function verifySignature(
    header: string,
    payload: string,
  ): Promise<boolean> {
    const parts = header.split('=');
    const sigHex = parts[1];

    const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };

    const keyBytes = encoder.encode(secret);
    const extractable = false;
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      algorithm,
      extractable,
      ['sign', 'verify'],
    );

    const sigBytes = hexToBytes(sigHex);
    const dataBytes = encoder.encode(payload);
    return crypto.subtle.verify(algorithm.name, key, sigBytes, dataBytes);
  }
  function hexToBytes(hex: string): Uint8Array {
    const len = hex.length / 2;
    const bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
      const c = hex.slice(i, i + 2);
      const b = Number.parseInt(c, 16);
      bytes[index] = b;
      index += 1;
    }

    return bytes;
  }
}
