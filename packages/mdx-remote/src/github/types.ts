export type Resolver =
  | {
      type: 'local';
      file: string;
    }
  | {
      type: 'github';

      /**
       * GitHub access token passed as option
       */
      accessToken?: string;
      blobUrl: string;
    };

export interface FileData {
  resolver: Resolver;

  /**
   * Cached file content when `keepContent` is enabled on resolvers
   */
  content?: string;
}
