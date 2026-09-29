/**
 * Browser build of the package entry: the RSC story factory reads files and hashes them,
 * so it is stubbed here and the headless layer stays importable from client code.
 */
export * from './provider';

export function defineStoryFactory(): never {
  throw new Error(
    '`defineStoryFactory()` is only available on Node.js, use the one of your bundler.',
  );
}

export function createFileSystemCache(): never {
  throw new Error('`createFileSystemCache()` is only available on Node.js.');
}
