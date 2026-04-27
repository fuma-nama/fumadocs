export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function errorToResponse(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  if (error && typeof error === 'object' && 'issues' in error) {
    return json({ error: 'Invalid request', issues: error.issues }, { status: 400 });
  }

  console.error(error);
  return new Response('Internal Server Error', { status: 500 });
}
