import { revalidateTag } from 'next/cache';
import type { CreateCacheOptions } from './cache';

export const createCreateGithubWebhookAPI = (
  ref: NonNullable<CreateCacheOptions<'remote'>['branch']>,
  revalidationTag: string,
) =>
  function createGithubWebhookAPI() {
    const encoder = new TextEncoder();

    const POST = async (request: Request): Promise<Response> => {
      const body = await request.text();
      const signature = request.headers.get('x-hub-signature-256');

      if (
        !signature ||
        !(await verifySignature('EXAMPLE_SECRET', signature, body))
      ) {
        return new Response('Unauthorized', { status: 401 });
      }

      const githubEvent = request.headers.get('x-github-event');

      if (githubEvent === 'push') {
        const data = JSON.parse(body) as {
          ref: string;
        };

        if (data.ref && data.ref === `refs/heads/${ref}`) {
          revalidateTag(revalidationTag);
        }
      }

      return new Response('Accepted', { status: 202 });
    };

    return {
      POST,
    };

    // from github example
    async function verifySignature(
      secret: string,
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
      const equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
      );

      return equal;
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
  };
