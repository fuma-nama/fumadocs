import { requireSession } from '@/lib/auth/session';
import { type ProjectRole, requireProjectAccess } from '@/lib/projects/access';

export async function requireProjectFromRequest(
  request: Request,
  projectId: string,
  role: ProjectRole = 'viewer',
) {
  const session = await requireSession(request.headers);
  const access = await requireProjectAccess(projectId, session.user.id, role);

  return {
    session,
    access,
  };
}
