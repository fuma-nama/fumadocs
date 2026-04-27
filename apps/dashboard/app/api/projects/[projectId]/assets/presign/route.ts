import { z } from 'zod';

import { requireProjectFromRequest } from '@/lib/api/project';
import { errorToResponse, json } from '@/lib/api/response';
import { assetKey } from '@/lib/storage/paths';
import { createPresignedPutUrl, publicObjectUrl } from '@/lib/storage/s3';

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { access } = await requireProjectFromRequest(request, projectId, 'editor');
    const body = presignSchema.parse(await request.json());
    const assetId = crypto.randomUUID();
    const key = assetKey(access.storage.prefix, assetId, body.filename);
    const uploadUrl = await createPresignedPutUrl({
      bucket: access.storage.bucket,
      key,
      contentType: body.contentType,
    });

    return json({
      assetId,
      key,
      uploadUrl,
      publicUrl: publicObjectUrl(access.storage.bucket, key),
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
