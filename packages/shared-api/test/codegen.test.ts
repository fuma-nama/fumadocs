import { expect, test } from 'vitest';
import { goString, javaTextBlock, jsTemplateLiteral, pythonString, rustString } from '@/codegen';

test('string literals escape the characters their language drops or rejects', () => {
  const str = 'cr\r nul\0 bom\uFEFF rlo\u202E';

  expect(jsTemplateLiteral(str)).toBe('`cr\\r nul\0 bom\uFEFF rlo\u202E`');
  expect(pythonString(str)).toBe('"""cr\\r nul\\000 bom\uFEFF rlo\u202E"""');
  expect(javaTextBlock(str)).toBe('"""\ncr\\r nul\\000 bom\uFEFF rlo\u202E"""');
  expect(goString(str)).toBe('`cr` + "\\r" + ` nul` + "\\x00" + ` bom` + "\\uFEFF" + ` rlo\u202E`');
  expect(rustString(str)).toBe('"cr\\r nul\0 bom\uFEFF rlo\\u{202e}"');
});
