import type { MediaAdapter } from '@/requests/media/adapter';
import type { EncodedParameter } from '@/requests/media/encode';

export type SampleGenerator<ServerContext = unknown> = (
  url: string,
  data: RequestData,
  context: {
    mediaAdapters: Record<string, MediaAdapter>;
    server: ServerContext;
  },
) => string;

export interface RawRequestData {
  method: string;

  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;

  body?: unknown;
  bodyMediaType?: string;
}

export interface RequestData {
  method: string;

  path: Record<string, EncodedParameter>;
  query: Record<string, EncodedParameter>;
  header: Record<string, EncodedParameter>;
  cookie: Record<string, EncodedParameter>;

  body?: unknown;
  bodyMediaType?: string;
}
