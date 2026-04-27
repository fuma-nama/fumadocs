import { auth } from './auth';

export async function getSessionFromHeaders(requestHeaders?: Headers) {
  const resolvedHeaders = requestHeaders ?? (await import('next/headers')).headers();

  return auth.api.getSession({
    headers: await resolvedHeaders,
  });
}

export async function requireSession(requestHeaders?: Headers) {
  const session = await getSessionFromHeaders(requestHeaders);

  if (!session) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return session;
}
