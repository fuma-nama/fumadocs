import { useRenderContext } from '../contexts/api';
import { useMemo } from 'react';

type KeyName = 'server-url' | `auth-${string}`;

export function useStorageKey() {
  const { storageKeyPrefix } = useRenderContext();

  return useMemo(
    () => ({
      of: (name: KeyName) => getStorageKey(storageKeyPrefix, name),
      AuthField: (schemeId: string) => getStorageKey(storageKeyPrefix, `auth-${schemeId}`),
    }),
    [storageKeyPrefix],
  );
}

function getStorageKey(prefix = 'fumadocs-asyncapi-', name: KeyName) {
  return prefix + name;
}
