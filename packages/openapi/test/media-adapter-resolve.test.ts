import { describe, expect, test } from 'vitest';
import {
  defaultAdapters,
  isMediaTypeSupported,
  resolveMediaAdapter,
} from '@/requests/media/adapter';

describe('Media Adapter Resolution', () => {
  test('resolves exact match', () => {
    const adapter = resolveMediaAdapter('application/json', defaultAdapters);
    expect(adapter).toBe(defaultAdapters['application/json']);
  });

  test('resolves case-insensitive match', () => {
    const adapter = resolveMediaAdapter('Application/JSON', defaultAdapters);
    expect(adapter).toBe(defaultAdapters['application/json']);
  });

  test('resolves with charset parameter', () => {
    const adapter = resolveMediaAdapter(
      'application/json; charset=utf-8',
      defaultAdapters,
    );
    expect(adapter).toBe(defaultAdapters['application/json']);
  });

  test('resolves +json suffix variants', () => {
    // These should all resolve to application/json adapter
    const variants = [
      'application/json-patch+json',
      'application/merge-patch+json',
      'application/ld+json',
      'application/vnd.api+json',
      'application/hal+json',
      'application/problem+json',
      'application/vnd.oai.openapi+json',
    ];

    for (const variant of variants) {
      const adapter = resolveMediaAdapter(variant, defaultAdapters);
      expect(adapter, variant).toBe(defaultAdapters['application/json']);
    }
  });

  test('resolves +xml suffix variants', () => {
    const variants = ['application/soap+xml', 'application/rss+xml'];

    for (const variant of variants) {
      const adapter = resolveMediaAdapter(variant, defaultAdapters);
      expect(adapter).toBe(defaultAdapters['application/xml']);
    }
  });

  test('returns undefined for unsupported media type', () => {
    const adapter = resolveMediaAdapter('application/yaml', defaultAdapters);
    expect(adapter).toBeUndefined();
  });

  test('returns undefined for unsupported +suffix', () => {
    const adapter = resolveMediaAdapter(
      'application/custom+yaml',
      defaultAdapters,
    );
    expect(adapter).toBeUndefined();
  });

  test('isMediaTypeSupported returns true for supported types', () => {
    expect(isMediaTypeSupported('application/json', defaultAdapters)).toBe(
      true,
    );
    expect(
      isMediaTypeSupported('application/json-patch+json', defaultAdapters),
    ).toBe(true);
    expect(isMediaTypeSupported('multipart/form-data', defaultAdapters)).toBe(
      true,
    );
  });

  test('isMediaTypeSupported returns false for unsupported types', () => {
    expect(isMediaTypeSupported('application/yaml', defaultAdapters)).toBe(
      false,
    );
    expect(isMediaTypeSupported('text/plain', defaultAdapters)).toBe(false);
  });
});
