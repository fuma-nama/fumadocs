import type { EncodedParameter, EncodedParameterMultiple } from '@/requests/media/encode';
import type { HttpMethods } from '@/types';

export interface RawRequestData {
  method: HttpMethods;

  path: Record<string, unknown>;
  query: Record<string, unknown>;
  header: Record<string, unknown>;
  cookie: Record<string, unknown>;

  body?: unknown;
  bodyMediaType?: string;
}

export interface RequestData {
  method: HttpMethods;

  path: Record<string, EncodedParameter>;
  query: Record<string, EncodedParameterMultiple>;
  header: Record<string, EncodedParameter>;
  cookie: Record<string, EncodedParameter>;

  body?: unknown;
  bodyMediaType?: string;
}
