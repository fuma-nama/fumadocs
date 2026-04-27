import { z } from 'zod';

import { requireProjectFromRequest } from '@/lib/api/project';
import { errorToResponse, json } from '@/lib/api/response';
import { contentKey, joinS3Key, normalizeEditorPath } from '@/lib/storage/paths';
import {
  copyObject,
  deleteObject,
  listAllKeys,
  listFolder,
  writeTextObject,
} from '@/lib/storage/s3';

const mutationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('createFile'),
    path: z.string().min(1),
    content: z.string().default(''),
  }),
  z.object({
    action: z.literal('delete'),
    path: z.string().min(1),
    recursive: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('move'),
    from: z.string().min(1),
    to: z.string().min(1),
    recursive: z.boolean().default(false),
  }),
]);

function folderPrefix(projectPrefix: string, path: string) {
  return `${joinS3Key(projectPrefix, 'content', normalizeEditorPath(path))}/`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { access } = await requireProjectFromRequest(request, projectId);
    const url = new URL(request.url);
    const recursive = url.searchParams.get('recursive') === 'true';
    const path = normalizeEditorPath(url.searchParams.get('prefix') ?? '');

    if (recursive) {
      const contentPrefix = `${joinS3Key(access.storage.prefix, 'content')}/`;
      const keys = await listAllKeys(access.storage.bucket, contentPrefix);

      return json({
        prefix: contentPrefix,
        path: '',
        entries: keys
          .filter((key) => !key.endsWith('/'))
          .map((key) => {
            const relative = key.slice(contentPrefix.length);
            const name = relative.split('/').at(-1) ?? relative;

            return {
              kind: 'file' as const,
              name,
              path: relative,
              key,
              size: 0,
              updatedAt: null,
            };
          })
          .sort((a, b) => a.path.localeCompare(b.path)),
      });
    }

    const folder = await listFolder({
      bucket: access.storage.bucket,
      projectPrefix: access.storage.prefix,
      folderPath: path,
    });

    return json(folder);
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { access } = await requireProjectFromRequest(request, projectId, 'editor');
    const body = mutationSchema.parse(await request.json());

    if (body.action === 'createFile') {
      const key = contentKey(access.storage.prefix, body.path);
      await writeTextObject(
        access.storage.bucket,
        key,
        body.content,
        'text/markdown; charset=utf-8',
      );
      return json({ key });
    }

    if (body.action === 'delete') {
      if (body.recursive) {
        const prefix = folderPrefix(access.storage.prefix, body.path);
        const keys = await listAllKeys(access.storage.bucket, prefix);
        await Promise.all(keys.map((item) => deleteObject(access.storage.bucket, item)));
        return json({ deleted: keys.length });
      }

      const key = contentKey(access.storage.prefix, body.path);
      await deleteObject(access.storage.bucket, key);
      return json({ deleted: 1 });
    }

    if (body.recursive) {
      const fromPrefix = folderPrefix(access.storage.prefix, body.from);
      const toPrefix = folderPrefix(access.storage.prefix, body.to);
      const keys = await listAllKeys(access.storage.bucket, fromPrefix);

      await Promise.all(
        keys.map(async (key) => {
          const toKey = `${toPrefix}${key.slice(fromPrefix.length)}`;
          await copyObject(access.storage.bucket, key, toKey);
          await deleteObject(access.storage.bucket, key);
        }),
      );

      return json({ moved: keys.length, fromPrefix, toPrefix });
    }

    const fromKey = contentKey(access.storage.prefix, body.from);
    const toKey = contentKey(access.storage.prefix, body.to);
    await copyObject(access.storage.bucket, fromKey, toKey);
    await deleteObject(access.storage.bucket, fromKey);
    return json({ fromKey, toKey });
  } catch (error) {
    return errorToResponse(error);
  }
}
