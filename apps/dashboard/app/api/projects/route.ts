import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { project, projectMember, projectStorage } from '@/db/schema';
import { errorToResponse, json } from '@/lib/api/response';
import { requireSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { contentKey } from '@/lib/storage/paths';
import { writeTextObject } from '@/lib/storage/s3';

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and dashes.'),
});

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET(request: Request) {
  try {
    const session = await requireSession(request.headers);
    const projects = await db
      .select({
        id: project.id,
        slug: project.slug,
        name: project.name,
        ownerId: project.ownerId,
        role: projectMember.role,
        updatedAt: project.updatedAt,
      })
      .from(projectMember)
      .innerJoin(project, eq(project.id, projectMember.projectId))
      .where(eq(projectMember.userId, session.user.id))
      .orderBy(desc(project.updatedAt));

    return json({ projects });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request.headers);
    const input = await request.json();
    const parsed = createProjectSchema.parse({
      ...input,
      slug: input.slug || slugify(input.name ?? ''),
    });
    const projectId = crypto.randomUUID();
    const storagePrefix = `projects/${projectId}`;
    const starterKey = contentKey(storagePrefix, 'docs/index.mdx');

    await db.transaction(async (tx) => {
      await tx.insert(project).values({
        id: projectId,
        slug: parsed.slug,
        name: parsed.name,
        ownerId: session.user.id,
      });
      await tx.insert(projectMember).values({
        projectId,
        userId: session.user.id,
        role: 'owner',
      });
      await tx.insert(projectStorage).values({
        projectId,
        bucket: env.DASHBOARD_S3_BUCKET,
        prefix: storagePrefix,
      });
    });

    await writeTextObject(
      env.DASHBOARD_S3_BUCKET,
      starterKey,
      `# ${parsed.name}\n\nStart writing your docs here.\n`,
      'text/markdown; charset=utf-8',
    );

    return json(
      {
        project: {
          id: projectId,
          slug: parsed.slug,
          name: parsed.name,
          role: 'owner' as const,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
