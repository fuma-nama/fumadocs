import type { ApiPageProps } from '@/render/api-page';
import type { DocumentInput } from '@/utils/process-document';
import { createProxy } from '@/server/proxy';

export interface OpenAPIOptions
  extends Omit<Partial<ApiPageProps>, 'document'> {
  /**
   * @deprecated Pass document to `APIPage` instead
   */
  documentOrPath?: DocumentInput;
}

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
