import type { AuthField } from '@/playground/client';
import { useApiContext } from '../contexts/api';
import { useMemo } from 'react';

type KeyName = 'server-url' | `auth-${string}`;

export function useStorageKey() {
  const { storageKeyPrefix } = useApiContext().client;

  return useMemo(
    () => ({
      of: (name: KeyName) => getStorageKey(storageKeyPrefix, name),
      AuthField: (field: AuthField) =>
        getStorageKey(
          storageKeyPrefix,
          `auth-${field.original?.id ?? field.fieldName}`,
        ),
    }),
    [storageKeyPrefix],
  );
}

export function getStorageKey(prefix = 'fumadocs-openapi-', name: KeyName) {
  return prefix + name;
}
