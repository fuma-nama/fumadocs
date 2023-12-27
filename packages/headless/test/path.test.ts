import {
  isRelative,
  joinPaths,
  parseFilePath,
  parseFolderPath,
  splitPath,
} from '@/source/path';
import { describe, expect, test } from 'vitest';

describe('Path utilities', () => {
  test('parse file path', () => {
    expect(parseFilePath('test.mdx')).toEqual({
      dirname: '',
      name: 'test',
      flattenedPath: 'test',
      locale: undefined,
      path: 'test.mdx',
    });

    expect(parseFilePath('nested/test.mdx')).toEqual({
      dirname: 'nested',
      name: 'test',
      flattenedPath: 'nested/test',
      locale: undefined,
      path: 'nested/test.mdx',
    });

    expect(parseFilePath('nested/test.cn.mdx')).toEqual({
      dirname: 'nested',
      name: 'test',
      flattenedPath: 'nested/test.cn',
      locale: 'cn',
      path: 'nested/test.cn.mdx',
    });
  });

  test('parse folder path', () => {
    expect(parseFolderPath('nested')).toEqual({
      dirname: '',
      name: 'nested',
      flattenedPath: 'nested',
      locale: undefined,
      path: 'nested',
    });

    expect(parseFolderPath('nested/nested')).toEqual({
      dirname: 'nested',
      name: 'nested',
      flattenedPath: 'nested/nested',
      locale: undefined,
      path: 'nested/nested',
    });
  });

  test('join paths', () => {
    expect(joinPaths(['a', 'b', 'c'])).toBe('a/b/c');
    expect(joinPaths(['/a'])).toBe('a');
    expect(joinPaths(['a/', '/b'])).toBe('a/b');
    expect(joinPaths(['a/', 'b/c'])).toBe('a/b/c');

    expect(joinPaths(['a', 'b'], 'leading')).toBe('/a/b');
    expect(joinPaths(['a', 'b'], 'trailing')).toBe('a/b/');
  });

  test('split paths', () => {
    expect(splitPath('a/b/c')).toEqual(['a', 'b', 'c']);
    expect(splitPath('a//c')).toEqual(['a', 'c']);
    expect(splitPath('/a/c')).toEqual(['a', 'c']);
  });

  test('is relative', () => {
    expect(isRelative('nested/file.mdx', 'nested')).toBe(true);
    expect(isRelative('file.mdx', 'nested')).toBe(false);
  });
});
