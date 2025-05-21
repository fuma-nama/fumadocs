import type { ApiPageProps } from '@/render/api-page';
import { createProxy } from '@/server/proxy';

export type OpenAPIOptions = Omit<Partial<ApiPageProps>, 'document'>;

export interface OpenAPIServer {
  getAPIPageProps: (from: ApiPageProps) => ApiPageProps;
  createProxy: typeof createProxy;
}

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  return {
    createProxy,
    getAPIPageProps(props) {
      return {
        ...options,
        ...props,
      };
    },
  };
}
