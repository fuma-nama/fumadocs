import { describe, expect, test } from 'vitest';
import { splitBlocks } from '../src/markdown';

describe('splitBlocks', () => {
  test('splits at blank lines', () => {
    expect(splitBlocks('# Title\n\nFirst paragraph\nstill first\n\n\nSecond')).toEqual([
      '# Title',
      'First paragraph\nstill first',
      'Second',
    ]);
  });

  test('keeps code fences whole', () => {
    const code = '```ts\nconst a = 1;\n\nconst b = 2;\n```';
    expect(splitBlocks(`Intro\n\n${code}\n\nAfter`)).toEqual(['Intro', code, 'After']);
  });

  test('a fence closes only with the same marker, at least as long', () => {
    const code = '````md\n```js\n\nnested\n```\n````';
    expect(splitBlocks(`${code}\n\nAfter`)).toEqual([code, 'After']);
  });

  test('an unclosed fence runs to the end while streaming', () => {
    expect(splitBlocks('Intro\n\n```ts\nconst a = 1;\n\n')).toEqual([
      'Intro',
      '```ts\nconst a = 1;\n\n',
    ]);
  });

  test('keeps loose lists and indented continuations in one block', () => {
    const list = '1. First\n\n   More about first\n\n2. Second\n\n- nested';
    expect(splitBlocks(`${list}\n\nOutro`)).toEqual([list, 'Outro']);
  });

  test('settled blocks stay the same as the text grows', () => {
    const settled = splitBlocks('Para one\n\nPara t');
    expect(splitBlocks('Para one\n\nPara two is longer')[0]).toBe(settled[0]);
  });
});
