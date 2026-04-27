import { z } from 'zod';

import { db } from '@/db/client';
import { asset } from '@/db/schema';
import { requireProjectFromRequest } from '@/lib/api/project';
import { errorToResponse, json } from '@/lib/api/response';
import { publicObjectUrl } from '@/lib/storage/s3';

const assetSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
  checksum: z.string().optional(),
  manifestPath: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { session, access } = await requireProjectFromRequest(request, projectId, 'editor');
    const body = assetSchema.parse(await request.json());

    await db.insert(asset).values({
      id: body.id,
      projectId,
      manifestPath: body.manifestPath,
      storageKey: body.key,
      filename: body.filename,
      contentType: body.contentType,
      size: body.size,
      checksum: body.checksum,
      createdBy: session.user.id,
    });

    return json({
      id: body.id,
      key: body.key,
      url: publicObjectUrl(access.storage.bucket, body.key),
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
