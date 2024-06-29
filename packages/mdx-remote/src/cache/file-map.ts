/**
 * In-memory cache for file content
 *
 * **Dev environment** only, should not be used on serverless environment
 */
export interface FileMap {
  /**
   * @param path - normalized path to a file
   */
  read: (path: string) => { content: string; hash: number } | undefined;

  /**
   * @param path - normalized path to a file
   */
  write: (path: string, file: { content: string; hash: number }) => void;

  /**
   * @param path - normalized path to a file
   */
  revoke: (path: string) => void;
}

export function createFileMap(): FileMap {
  const contentMap = new Map<string, { content: string; hash: number }>();

  return {
    read(path) {
      return contentMap.get(path);
    },
    write(path, content) {
      contentMap.set(path, content);
    },
    revoke(path) {
      contentMap.delete(path);
    },
  };
}
