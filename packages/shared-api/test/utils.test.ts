import { describe, expect, test } from 'vitest';
import { joinURL, resolveServerUrl } from '@/utils/url';

describe('URL utilities', () => {
  describe('joinURL', () => {
    test('joins base URL with pathname', () => {
      expect(joinURL('https://api.example.com', 'users')).toBe('https://api.example.com/users');
    });

    test('handles trailing slash in base', () => {
      expect(joinURL('https://api.example.com/', 'users')).toBe('https://api.example.com/users');
    });

    test('handles leading slash in pathname', () => {
      expect(joinURL('https://api.example.com', '/users')).toBe('https://api.example.com/users');
    });

    test('handles both trailing and leading slashes', () => {
      expect(joinURL('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
    });

    test('handles empty pathname', () => {
      expect(joinURL('https://api.example.com', '')).toBe('https://api.example.com');
    });
  });

  describe('resolveServerUrl', () => {
    test('replaces single variable', () => {
      expect(resolveServerUrl('https://{host}/api', { host: 'api.example.com' })).toBe(
        'https://api.example.com/api',
      );
    });

    test('replaces multiple variables', () => {
      expect(
        resolveServerUrl('https://{host}:{port}/api/{version}', {
          host: 'api.example.com',
          port: '8080',
          version: 'v1',
        }),
      ).toBe('https://api.example.com:8080/api/v1');
    });

    test('handles no variables', () => {
      expect(resolveServerUrl('https://api.example.com', {})).toBe('https://api.example.com');
    });
  });
});
