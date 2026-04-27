import { getSessionFromHeaders } from '@/lib/auth/session';
import { errorToResponse, json } from '@/lib/api/response';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromHeaders(request.headers);
    return json({ session });
  } catch (error) {
    return errorToResponse(error);
  }
}
