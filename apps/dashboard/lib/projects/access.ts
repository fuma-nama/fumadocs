import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { project, projectMember, projectStorage } from '@/db/schema';
import { env } from '@/lib/env';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export type ProjectAccess = {
  project: typeof project.$inferSelect;
  role: ProjectRole;
  storage: {
    bucket: string;
    prefix: string;
    defaultWorkspace: string;
  };
};

const roleRank: Record<ProjectRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

function can(role: ProjectRole, minimum: ProjectRole) {
  return roleRank[role] >= roleRank[minimum];
}

export async function getProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccess | null> {
  const rows = await db
    .select({
      project,
      role: projectMember.role,
      storage: projectStorage,
    })
    .from(project)
    .innerJoin(
      projectMember,
      and(eq(projectMember.projectId, project.id), eq(projectMember.userId, userId)),
    )
    .leftJoin(projectStorage, eq(projectStorage.projectId, project.id))
    .where(eq(project.id, projectId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    project: row.project,
    role: row.role,
    storage: {
      bucket: row.storage?.bucket ?? env.DASHBOARD_S3_BUCKET,
      prefix: row.storage?.prefix ?? `projects/${projectId}`,
      defaultWorkspace: row.storage?.defaultWorkspace ?? 'main',
    },
  };
}

export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minimumRole: ProjectRole = 'viewer',
) {
  const access = await getProjectAccess(projectId, userId);

  if (!access) {
    throw new Response('Project not found', { status: 404 });
  }

  if (!can(access.role, minimumRole)) {
    throw new Response('Forbidden', { status: 403 });
  }

  return access;
}
