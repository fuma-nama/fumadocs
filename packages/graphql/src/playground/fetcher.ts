export interface PlaygroundRequest {
  url: string;
  query: string;
  variables?: unknown;
  headers: Record<string, string>;
}

export type PlaygroundResult =
  | {
      type: 'response';
      status: number;
      /**
       * time taken in milliseconds
       */
      time: number;
      body: string;
      contentType: string;
    }
  | {
      type: 'client_error';
      message: string;
    };

/**
 * the default fetcher: send the operation to a GraphQL endpoint over HTTP POST.
 */
export async function executeGraphQL(request: PlaygroundRequest): Promise<PlaygroundResult> {
  const start = performance.now();

  try {
    const res = await fetch(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/graphql-response+json, application/json',
        ...request.headers,
      },
      body: JSON.stringify({
        query: request.query,
        variables: request.variables,
      }),
    });

    return {
      type: 'response',
      status: res.status,
      time: performance.now() - start,
      body: await res.text(),
      contentType: res.headers.get('Content-Type') ?? '',
    };
  } catch (e) {
    return {
      type: 'client_error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
