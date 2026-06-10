import { describe, expect, test } from 'vitest';
import { pathnameFromRequest } from '@/requests/generators';
import type { RequestData } from '@/requests/types';

describe('URL utilities', () => {
  describe('resolveRequestData', () => {
    test('basic path parameter substitution', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {
          id: { value: '123' },
        },
        query: {},
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/users/{id}', requestData)).toBe('/api/users/123');
    });

    test('multiple path parameters', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {
          userId: { value: '123' },
          postId: { value: '456' },
        },
        query: {},
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/users/{userId}/posts/{postId}', requestData)).toBe(
        '/api/users/123/posts/456',
      );
    });

    test('array path parameter', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {
          segments: { value: 'api/v1/users' },
        },
        query: {},
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/{segments}', requestData)).toBe('/api/v1/users');
    });

    test('adds query parameters to clean path', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          limit: { values: ['10'] },
          offset: { values: ['20'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/users', requestData)).toBe('/api/users?limit=10&offset=20');
    });

    test('handles array query parameters', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          tags: { values: ['javascript', 'typescript'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/posts', requestData)).toBe(
        '/api/posts?tags=javascript&tags=typescript',
      );
    });

    // Core test cases for paths with existing query parameters (legacy API support)
    test('path with existing query parameter - verbose example', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          limit: { values: ['5'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/foo/bar?verbose=true', requestData)).toBe(
        '/api/foo/bar?verbose=true&limit=5',
      );
    });

    test('path with existing query parameter - search example', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          limit: { values: ['10'] },
          sort: { values: ['date'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/location/search?name=foo', requestData)).toBe(
        '/api/location/search?name=foo&limit=10&sort=date',
      );
    });

    test('path with existing query parameters and path parameters', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {
          userId: { value: '123' },
        },
        query: {
          include: { values: ['profile'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/users/{userId}/posts?published=true', requestData)).toBe(
        '/api/users/123/posts?published=true&include=profile',
      );
    });

    test('overrides existing query parameter with new value', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          verbose: { values: ['false'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/foo/bar?verbose=true', requestData)).toBe(
        '/api/foo/bar?verbose=false',
      );
    });

    test('handles multiple existing query parameters', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          newParam: { values: ['value'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/search?q=test&type=user&active=true', requestData)).toBe(
        '/api/search?q=test&type=user&active=true&newParam=value',
      );
    });

    test('handles array parameters with existing query string', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          categories: { values: ['tech', 'science'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/articles?featured=true', requestData)).toBe(
        '/api/articles?featured=true&categories=tech&categories=science',
      );
    });

    test('replaces existing array parameter', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {
          tags: { values: ['new', 'updated'] },
        },
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/posts?tags=old&tags=legacy', requestData)).toBe(
        '/api/posts?tags=new&tags=updated',
      );
    });

    test('handles empty query parameters object', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {},
        query: {},
        header: {},
        cookie: {},
      };

      expect(pathnameFromRequest('/api/foo/bar?verbose=true', requestData)).toBe(
        '/api/foo/bar?verbose=true',
      );
    });

    test('complex scenario with path params, existing query, and new query params', () => {
      const requestData: RequestData = {
        method: 'get',
        path: {
          orgId: { value: 'acme' },
          projectId: { value: 'web-app' },
        },
        query: {
          include: { values: ['members', 'settings'] },
          format: { values: ['json'] },
          debug: { values: ['true'] },
        },
        header: {},
        cookie: {},
      };

      const result = pathnameFromRequest(
        '/api/orgs/{orgId}/projects/{projectId}?version=latest&archived=false',
        requestData,
      );
      expect(result).toBe(
        '/api/orgs/acme/projects/web-app?version=latest&archived=false&include=members&include=settings&format=json&debug=true',
      );
    });
  });
});
