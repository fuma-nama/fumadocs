import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/lib/env';
import { joinS3Key } from '@/lib/storage/paths';

const globalForS3 = globalThis as typeof globalThis & {
  dashboardS3?: S3Client;
};

export const s3 =
  globalForS3.dashboardS3 ??
  new S3Client({
    region: env.AWS_REGION,
    endpoint: env.DASHBOARD_S3_ENDPOINT,
    forcePathStyle: env.DASHBOARD_S3_FORCE_PATH_STYLE,
    credentials:
      env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForS3.dashboardS3 = s3;
}

export type S3FileEntry = {
  kind: 'file';
  name: string;
  path: string;
  key: string;
  size: number;
  updatedAt: string | null;
};

export type S3FolderEntry = {
  kind: 'folder';
  name: string;
  path: string;
  prefix: string;
};

export type S3TreeEntry = S3FileEntry | S3FolderEntry;

export async function listFolder({
  bucket,
  projectPrefix,
  folderPath,
}: {
  bucket: string;
  projectPrefix: string;
  folderPath: string;
}) {
  const contentPrefix = joinS3Key(projectPrefix, 'content');
  const prefix = `${joinS3Key(contentPrefix, folderPath)}/`.replace(/\/$/, '/');
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/',
    }),
  );

  const folders: S3FolderEntry[] = (response.CommonPrefixes ?? []).map((item) => {
    const rawPrefix = item.Prefix ?? '';
    const relative = rawPrefix.slice(contentPrefix.length).replace(/^\/+|\/+$/g, '');
    const name = relative.split('/').at(-1) ?? relative;
    return {
      kind: 'folder',
      name,
      path: relative,
      prefix: rawPrefix,
    };
  });

  const files: S3FileEntry[] = (response.Contents ?? [])
    .filter((item) => item.Key && item.Key !== prefix)
    .map((item) => {
      const key = item.Key!;
      const relative = key.slice(contentPrefix.length).replace(/^\/+/, '');
      const name = relative.split('/').at(-1) ?? relative;
      return {
        kind: 'file',
        name,
        path: relative,
        key,
        size: item.Size ?? 0,
        updatedAt: item.LastModified?.toISOString() ?? null,
      };
    });

  return {
    prefix,
    path: folderPath,
    entries: [...folders, ...files].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
  };
}

export async function listAllKeys(bucket: string, prefix: string) {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }

    token = response.NextContinuationToken;
  } while (token);

  return keys;
}

export async function readTextObject(bucket: string, key: string) {
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return (await response.Body?.transformToString()) ?? '';
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

export async function writeTextObject(
  bucket: string,
  key: string,
  body: string,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function readBytesObject(bucket: string, key: string) {
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? new Uint8Array(bytes) : null;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

export async function writeBytesObject(
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function copyObject(bucket: string, fromKey: string, toKey: string) {
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${fromKey}`,
      Key: toKey,
    }),
  );
}

export async function deleteObject(bucket: string, key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createPresignedPutUrl({
  bucket,
  key,
  contentType,
}: {
  bucket: string;
  key: string;
  contentType: string;
}) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 5 },
  );
}

export function publicObjectUrl(bucket: string, key: string) {
  if (env.DASHBOARD_S3_PUBLIC_BASE_URL) {
    return `${env.DASHBOARD_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }

  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
