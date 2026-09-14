import { useOpenAPI } from '@/headless/runtime';
import { useMemo } from 'react';

type KeyName = 'server-url' | `auth-${string}`;

export function useStorageKey() {
  const { storageKeyPrefix } = useOpenAPI();

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
