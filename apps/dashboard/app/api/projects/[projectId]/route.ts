import { requireProjectFromRequest } from '@/lib/api/project';
import { errorToResponse, json } from '@/lib/api/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { access } = await requireProjectFromRequest(request, projectId);

    return json({
      project: access.project,
      role: access.role,
      storage: {
        prefix: access.storage.prefix,
        defaultWorkspace: access.storage.defaultWorkspace,
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
