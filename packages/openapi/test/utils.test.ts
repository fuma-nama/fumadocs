import { describe, expect, test } from 'vitest';
import { pathnameFromRequest } from '@/requests/generators';
import { defaultAdapters } from '@/requests/media/adapter';
import { encodeRequestData } from '@/requests/media/encode';
import { cookieString } from '@/requests/string-utils';
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

test('serializes matrix path parameters', () => {
  const encode = (value: unknown, explode: boolean) =>
    encodeRequestData(
      { method: 'get', path: { id: value }, query: {}, header: {}, cookie: {} },
      defaultAdapters,
      [{ name: 'id', in: 'path', style: 'matrix', explode }],
    ).path.id.value;

  expect(encode([3, 4], true)).toBe(';id=3;id=4');
  expect(encode([3, 4], false)).toBe(';id=3,4');
  expect(encode({ a: 1, b: 2 }, true)).toBe(';a=1;b=2');
  expect(encode({ a: 1, b: 2 }, false)).toBe(';id=a,1,b,2');
});

test('percent-encodes path parameter values but not their delimiters', () => {
  const encode = (value: unknown, style?: 'simple' | 'label' | 'matrix', explode = false) =>
    encodeRequestData(
      { method: 'get', path: { id: value }, query: {}, header: {}, cookie: {} },
      defaultAdapters,
      [{ name: 'id', in: 'path', style, explode }],
    ).path.id.value;

  expect(encode('report#1')).toBe('report%231');
  expect(encode('a/b?c d%')).toBe('a%2Fb%3Fc%20d%25');
  expect(encode(['a b', 'c/d'])).toBe('a%20b,c%2Fd');
  expect(encode({ 'k y': 'a,b' }, 'simple', true)).toBe('k%20y=a%2Cb');
  expect(encode(['a b', 'c'], 'label', true)).toBe('.a%20b.c');
  expect(encode('a;b', 'matrix')).toBe(';id=a%3Bb');
  expect(encode({ x: 'a=b' }, 'matrix', true)).toBe(';x=a%3Db');
  expect(encode(JSON.parse('{"__proto__":"x","ok":"y"}'))).toBe('__proto__,x,ok,y');

  const json = encodeRequestData(
    { method: 'get', path: { id: { a: '/' } }, query: {}, header: {}, cookie: {} },
    defaultAdapters,
    [{ name: 'id', in: 'path', content: { 'application/json': {} } }],
  ).path.id.value;
  expect(decodeURIComponent(json)).toBe(JSON.stringify({ a: '/' }));
  expect(json).not.toMatch(/[/{}"]/);
});

test('sends a path parameter with reserved characters to the right URL', () => {
  const data = encodeRequestData(
    {
      method: 'get',
      path: { name: 'report#1' },
      query: { q: 'a&b' },
      header: { 'X-Name': 'a/b c' },
      cookie: {},
    },
    defaultAdapters,
  );

  expect(pathnameFromRequest('/files/{name}', data)).toBe('/files/report%231?q=a%26b');
  // headers are not part of the URL
  expect(data.header['X-Name'].value).toBe('a/b c');
});

test('names an exploded array cookie once per value', () => {
  const cookie = (value: unknown, explode?: boolean) =>
    cookieString(
      encodeRequestData(
        { method: 'get', path: {}, query: {}, header: {}, cookie: { id: value } },
        defaultAdapters,
        [{ name: 'id', in: 'cookie', explode }],
      ).cookie,
    );

  // `form` style, as in https://swagger.io/docs/specification/v3_0/serialization
  expect(cookie([3, 4])).toBe('id=3&id=4');
  expect(cookie([3, 4], false)).toBe('id=3,4');
  expect(cookie('x')).toBe('id=x');
  expect(cookie({ a: 1, b: 2 })).toBe('a=1; b=2');
});
