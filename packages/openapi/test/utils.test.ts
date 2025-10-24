import { describe, expect, test } from 'vitest';
import { combineSchema } from '@/utils/combine-schema';
import {
  joinURL,
  resolveRequestData,
  resolveServerUrl,
  withBase,
} from '@/utils/url';
import type { RequestData } from '@/requests/types';

describe('Merge object schemas', () => {
  test('Merge single object', () => {
    const result = combineSchema([
      {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two'],
          },
        },
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects', () => {
    const result = combineSchema([
      {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two'],
          },
        },
      },
      {
        type: 'object',
        properties: {
          hello: {
            type: 'number',
          },
        },
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "hello": {
            "type": "number",
          },
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: required', () => {
    const result = combineSchema([
      {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two'],
          },
        },
      },
      {
        type: 'object',
        properties: {
          hello: {
            type: 'number',
          },
        },
        required: ['hello'],
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "hello": {
            "type": "number",
          },
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "required": [
          "hello",
        ],
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: additional properties', () => {
    const result = combineSchema([
      {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two'],
          },
        },
        additionalProperties: true,
      },
      {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      {
        "additionalProperties": true,
        "properties": {
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
        },
        "type": "object",
      }
    `);
  });

  test('Merge multiple objects: `allOf`', () => {
    const result = combineSchema([
      {
        type: 'object',
        properties: {
          test: {
            type: 'string',
            enum: ['one', 'two'],
          },
        },
      },
      {
        allOf: [
          {
            type: 'object',
            properties: {
              hello: {
                type: 'number',
              },
            },
          },
          {
            type: 'object',
            properties: {
              world: {
                type: 'number',
              },
            },
          },
        ],
      },
    ]);

    expect(result).toMatchInlineSnapshot(`
      {
        "properties": {
          "hello": {
            "type": "number",
          },
          "test": {
            "enum": [
              "one",
              "two",
            ],
            "type": "string",
          },
          "world": {
            "type": "number",
          },
        },
        "type": "object",
      }
    `);
  });
});

describe('URL utilities', () => {
  describe('joinURL', () => {
    test('joins base URL with pathname', () => {
      expect(joinURL('https://api.example.com', 'users')).toBe(
        'https://api.example.com/users',
      );
    });

    test('handles trailing slash in base', () => {
      expect(joinURL('https://api.example.com/', 'users')).toBe(
        'https://api.example.com/users',
      );
    });

    test('handles leading slash in pathname', () => {
      expect(joinURL('https://api.example.com', '/users')).toBe(
        'https://api.example.com/users',
      );
    });

    test('handles both trailing and leading slashes', () => {
      expect(joinURL('https://api.example.com/', '/users')).toBe(
        'https://api.example.com/users',
      );
    });

    test('handles empty pathname', () => {
      expect(joinURL('https://api.example.com', '')).toBe(
        'https://api.example.com',
      );
    });
  });

  describe('withBase', () => {
    test('returns absolute URL unchanged', () => {
      expect(withBase('https://other.com/api', 'https://base.com')).toBe(
        'https://other.com/api',
      );
    });

    test('joins relative URL with base', () => {
      expect(withBase('/api/users', 'https://base.com')).toBe(
        'https://base.com/api/users',
      );
    });

    test('joins relative URL without leading slash', () => {
      expect(withBase('api/users', 'https://base.com')).toBe(
        'https://base.com/api/users',
      );
    });
  });

  describe('resolveServerUrl', () => {
    test('replaces single variable', () => {
      expect(
        resolveServerUrl('https://{host}/api', { host: 'api.example.com' }),
      ).toBe('https://api.example.com/api');
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
      expect(resolveServerUrl('https://api.example.com', {})).toBe(
        'https://api.example.com',
      );
    });
  });

  describe('resolveRequestData', () => {
    test('basic path parameter substitution', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {
          id: { value: '123' },
        },
        query: {},
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/api/users/{id}', requestData)).toBe(
        '/api/users/123',
      );
    });

    test('multiple path parameters', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {
          userId: { value: '123' },
          postId: { value: '456' },
        },
        query: {},
        header: {},
        cookie: {},
      };

      expect(
        resolveRequestData('/api/users/{userId}/posts/{postId}', requestData),
      ).toBe('/api/users/123/posts/456');
    });

    test('array path parameter', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {
          segments: { value: ['api', 'v1', 'users'] },
        },
        query: {},
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/{segments}', requestData)).toBe(
        '/api/v1/users',
      );
    });

    test('adds query parameters to clean path', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          limit: { value: '10' },
          offset: { value: '20' },
        },
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/api/users', requestData)).toBe(
        '/api/users?limit=10&offset=20',
      );
    });

    test('handles array query parameters', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          tags: { value: ['javascript', 'typescript'] },
        },
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/api/posts', requestData)).toBe(
        '/api/posts?tags=javascript&tags=typescript',
      );
    });

    // Core test cases for paths with existing query parameters (legacy API support)
    test('path with existing query parameter - verbose example', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          limit: { value: '5' },
        },
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/api/foo/bar?verbose=true', requestData)).toBe(
        '/api/foo/bar?verbose=true&limit=5',
      );
    });

    test('path with existing query parameter - search example', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          limit: { value: '10' },
          sort: { value: 'date' },
        },
        header: {},
        cookie: {},
      };

      expect(
        resolveRequestData('/api/location/search?name=foo', requestData),
      ).toBe('/api/location/search?name=foo&limit=10&sort=date');
    });

    test('path with existing query parameters and path parameters', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {
          userId: { value: '123' },
        },
        query: {
          include: { value: 'profile' },
        },
        header: {},
        cookie: {},
      };

      expect(
        resolveRequestData(
          '/api/users/{userId}/posts?published=true',
          requestData,
        ),
      ).toBe('/api/users/123/posts?published=true&include=profile');
    });

    test('overrides existing query parameter with new value', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          verbose: { value: 'false' },
        },
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/api/foo/bar?verbose=true', requestData)).toBe(
        '/api/foo/bar?verbose=false',
      );
    });

    test('handles multiple existing query parameters', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          newParam: { value: 'value' },
        },
        header: {},
        cookie: {},
      };

      expect(
        resolveRequestData(
          '/api/search?q=test&type=user&active=true',
          requestData,
        ),
      ).toBe('/api/search?q=test&type=user&active=true&newParam=value');
    });

    test('handles array parameters with existing query string', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          categories: { value: ['tech', 'science'] },
        },
        header: {},
        cookie: {},
      };

      expect(
        resolveRequestData('/api/articles?featured=true', requestData),
      ).toBe('/api/articles?featured=true&categories=tech&categories=science');
    });

    test('replaces existing array parameter', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {
          tags: { value: ['new', 'updated'] },
        },
        header: {},
        cookie: {},
      };

      expect(
        resolveRequestData('/api/posts?tags=old&tags=legacy', requestData),
      ).toBe('/api/posts?tags=new&tags=updated');
    });

    test('handles empty query parameters object', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {},
        query: {},
        header: {},
        cookie: {},
      };

      expect(resolveRequestData('/api/foo/bar?verbose=true', requestData)).toBe(
        '/api/foo/bar?verbose=true',
      );
    });

    test('complex scenario with path params, existing query, and new query params', () => {
      const requestData: RequestData = {
        method: 'GET',
        path: {
          orgId: { value: 'acme' },
          projectId: { value: 'web-app' },
        },
        query: {
          include: { value: ['members', 'settings'] },
          format: { value: 'json' },
          debug: { value: 'true' },
        },
        header: {},
        cookie: {},
      };

      const result = resolveRequestData(
        '/api/orgs/{orgId}/projects/{projectId}?version=latest&archived=false',
        requestData,
      );
      expect(result).toBe(
        '/api/orgs/acme/projects/web-app?version=latest&archived=false&include=members&include=settings&format=json&debug=true',
      );
    });
  });
});
