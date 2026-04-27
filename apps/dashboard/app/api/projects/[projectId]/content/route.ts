import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { documentState } from '@/db/schema';
import { requireProjectFromRequest } from '@/lib/api/project';
import { errorToResponse, json } from '@/lib/api/response';
import { contentKey, ensureMdxPath } from '@/lib/storage/paths';
import { readTextObject, writeTextObject } from '@/lib/storage/s3';

const putSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { access } = await requireProjectFromRequest(request, projectId);
    const url = new URL(request.url);
    const path = ensureMdxPath(url.searchParams.get('path') ?? 'index.mdx');
    const key = contentKey(access.storage.prefix, path);
    const content = await readTextObject(access.storage.bucket, key);

    return json({
      path,
      key,
      content: content ?? '',
      exists: content !== null,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { session, access } = await requireProjectFromRequest(request, projectId, 'editor');
    const body = putSchema.parse(await request.json());
    const path = ensureMdxPath(body.path);
    const key = contentKey(access.storage.prefix, path);

    await writeTextObject(access.storage.bucket, key, body.content, 'text/markdown; charset=utf-8');
    await db
      .insert(documentState)
      .values({
        id: crypto.randomUUID(),
        projectId,
        objectKey: key,
        canonicalContentKey: key,
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: [documentState.projectId, documentState.objectKey],
        set: {
          canonicalContentKey: key,
          version: sql`${documentState.version} + 1`,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        },
      });

    return json({ path, key });
  } catch (error) {
    return errorToResponse(error);
  }
}
