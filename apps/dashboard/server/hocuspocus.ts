import { Server } from '@hocuspocus/server';
import { sql } from 'drizzle-orm';
import * as Y from 'yjs';

import { db } from '@/db/client';
import { documentState } from '@/db/schema';
import { auth } from '@/lib/auth/auth';
import { parseDocumentName } from '@/lib/editor/document-name';
import { env } from '@/lib/env';
import { requireProjectAccess, type ProjectRole } from '@/lib/projects/access';
import { contentKey, yjsStateKey } from '@/lib/storage/paths';
import { readBytesObject, writeBytesObject } from '@/lib/storage/s3';

type HocuspocusContext = {
  userId: string;
  role: ProjectRole;
  bucket: string;
  projectPrefix: string;
  projectId: string;
  path: string;
};

async function authenticateDocument(
  headers: Headers,
  documentName: string,
): Promise<HocuspocusContext> {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw new Error('Unauthorized');
  }

  const { projectId, path } = parseDocumentName(documentName);
  const access = await requireProjectAccess(projectId, session.user.id, 'viewer');

  return {
    userId: session.user.id,
    role: access.role,
    bucket: access.storage.bucket,
    projectPrefix: access.storage.prefix,
    projectId,
    path,
  };
}

const server = new Server<HocuspocusContext>({
  name: 'fumadocs-dashboard',
  port: env.HOCUSPOCUS_PORT,
  debounce: 2000,
  maxDebounce: 10000,

  async onAuthenticate(payload) {
    const context = await authenticateDocument(payload.requestHeaders, payload.documentName);
    payload.connectionConfig.readOnly = context.role === 'viewer';
    return context;
  },

  async onLoadDocument({ document, documentName, context }) {
    const { path } = parseDocumentName(documentName);
    const key = yjsStateKey(context.projectPrefix, path);
    const update = await readBytesObject(context.bucket, key);

    if (update) {
      Y.applyUpdate(document, update);
    }
  },

  async onStoreDocument({ document, documentName, lastContext }) {
    const { projectId, path } = parseDocumentName(documentName);
    const stateKey = yjsStateKey(lastContext.projectPrefix, path);
    const canonicalKey = contentKey(lastContext.projectPrefix, path);
    const update = Y.encodeStateAsUpdate(document);

    await writeBytesObject(lastContext.bucket, stateKey, update, 'application/octet-stream');
    await db
      .insert(documentState)
      .values({
        id: crypto.randomUUID(),
        projectId,
        objectKey: canonicalKey,
        yjsStateKey: stateKey,
        canonicalContentKey: canonicalKey,
        updatedBy: lastContext.userId,
      })
      .onConflictDoUpdate({
        target: [documentState.projectId, documentState.objectKey],
        set: {
          yjsStateKey: stateKey,
          version: sql`${documentState.version} + 1`,
          updatedBy: lastContext.userId,
          updatedAt: new Date(),
        },
      });
  },

  async onRequest({ response }) {
    response.setHeader('Access-Control-Allow-Origin', env.BETTER_AUTH_URL);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  },
});

await server.listen();

console.log(`Hocuspocus websocket listening on ${server.webSocketURL}`);
