'use client';
import { useSyncExternalStore } from 'react';
import {
  selectCodeUsage as selectStoredCodeUsage,
  useCodeUsageId as useStoredCodeUsageId,
} from 'shared-api/components/example';

const storageKey = 'fumadocs-graphql-code-usage';

export function selectCodeUsage(id: string) {
  selectStoredCodeUsage(storageKey, id);
}

/** the id of the code sample language selected in the session, `null` until one is selected */
export function useCodeUsageId(): string | null {
  return useStoredCodeUsageId(storageKey);
}

/** the headers of code samples, they send `Content-Type` themselves */
export function codeUsageHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name in headers) {
    if (name.toLowerCase() !== 'content-type') out[name] = headers[name];
  }

  return out;
}

const placeholderUrl = 'https://api.example.com/graphql';

function noop() {
  return () => {};
}

function resolveUrl(url: string): string {
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

/** the endpoint URL for code samples, relative URLs are resolved against the page once hydrated */
export function useEndpointUrl(url: string | undefined): string {
  return useSyncExternalStore(
    noop,
    () => (url ? resolveUrl(url) : placeholderUrl),
    () => url || placeholderUrl,
  );
}
