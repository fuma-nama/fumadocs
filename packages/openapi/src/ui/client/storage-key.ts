import { useApiContext } from '../contexts/api';
import { useMemo } from 'react';

type KeyName = 'server-url' | `auth-${string}`;

export function useStorageKey() {
  const { storageKeyPrefix } = useApiContext().client;

  return useMemo(
    () => ({
      of: (name: KeyName) => getStorageKey(storageKeyPrefix, name),
      AuthField: (schemeId: string) => getStorageKey(storageKeyPrefix, `auth-${schemeId}`),
    }),
    [storageKeyPrefix],
  );
}

function getStorageKey(prefix = 'fumadocs-openapi-', name: KeyName) {
  return prefix + name;
}
