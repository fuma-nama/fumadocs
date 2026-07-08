// oxlint-disable @typescript-eslint/no-explicit-any
import type { TinaCMSClient } from '@/index';

/**
 * mirror of `TinaClient` from `tinacms/dist/client`, to ensure
 * generated Tina clients remain assignable to `TinaCMSClient`.
 */
declare class MockTinaClient<GenQueries> {
  apiUrl: string;
  readonlyToken?: string;
  queries: GenQueries;
  request<DataType extends Record<string, any> = any>(
    args: {
      variables?: Record<string, any>;
      query: string;
      errorPolicy?: 'throw' | 'include';
    },
    options: {
      fetchOptions?: Parameters<typeof fetch>[1];
    },
  ): Promise<{
    data: DataType;
    errors: unknown[] | null;
    query: string;
  }>;
}

declare const generatedClient: MockTinaClient<{
  docs: (args: { relativePath: string }) => Promise<unknown>;
}>;

export const client: TinaCMSClient = generatedClient;
