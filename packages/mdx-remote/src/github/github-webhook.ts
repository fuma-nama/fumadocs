import { revalidateTag } from 'next/cache';
import type { CreateCacheOptions, GithubCache } from './cache';
import { findTreeRecursive } from './git-tree';
import type { getTree } from './get-tree';

export const createCreateGithubWebhookAPI = ({
  tree,
  diff,
  ref,
  directory,
  githubOptions,
  revalidationTag,
  set
}: {
  tree: GithubCache['tree'];
  diff: GithubCache['diff'];
  ref: NonNullable<CreateCacheOptions<'remote'>['branch']>;
  directory: string;
  githubOptions: Omit<Parameters<typeof getTree>[0], 'treeSha'>;
  revalidationTag: string;
  set: <K extends keyof GithubCache>(key: K, value: GithubCache[K]) => void;
}) =>
  function createGithubWebhookAPI(webhookSecret?: string) {
    const encoder = new TextEncoder();

    const POST = async (request: Request): Promise<Response> => {
      const body = await request.text();

      if (webhookSecret) {
        const signature = request.headers.get('x-hub-signature-256');

        if (
          !signature ||
          !(await verifySignature(webhookSecret, signature, body))
        ) {
          return new Response('Unauthorized', { status: 401 });
        }
      }

      const githubEvent = request.headers.get('x-github-event');

      if (githubEvent === 'push') {
        const data = JSON.parse(body) as {
          ref: string;
          after: string;
        };

        if (data.ref && data.ref === `refs/heads/${ref}`) {
          const newTree = await findTreeRecursive(directory, {
            ...githubOptions,
            treeSha: data.after,
            init: {
              ...githubOptions.init,
              // since this is an exact hash of the tree,
              // the inner content will not change
              cache: 'force-cache'
            }
          });

          if (newTree) {
            const changes = diff.compareToGitTree(newTree);
            if (changes.length > 0) {
              set('tree', Object.assign(tree, newTree));
              diff.applyToCache(changes);
              revalidateTag(revalidationTag);
            }
          }
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
