import type { EncodedParameter, EncodedParameterMultiple } from '@/requests/media/encode';

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
  query: Record<string, EncodedParameterMultiple>;
  header: Record<string, EncodedParameter>;
  cookie: Record<string, EncodedParameter>;

  body?: unknown;
  bodyMediaType?: string;
}
