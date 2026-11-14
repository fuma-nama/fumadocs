import { expect, test } from 'vitest';
import {
  goString,
  javaTextBlock,
  jsTemplateLiteral,
  pythonString,
  rubyString,
  rustString,
} from '@/codegen';

test('string literals escape the characters their language drops or rejects', () => {
  const str = 'cr\r nul\0 bom﻿ rlo‮';

  expect(jsTemplateLiteral(str)).toBe('`cr\\r nul\0 bom﻿ rlo‮`');
  expect(pythonString(str)).toBe('"""cr\\r nul\\000 bom﻿ rlo‮"""');
  expect(javaTextBlock(str)).toBe('"""\ncr\\r nul\\000 bom﻿ rlo‮"""');
  expect(goString(str)).toBe('`cr` + "\\r" + ` nul` + "\\x00" + ` bom` + "\\uFEFF" + ` rlo‮`');
  expect(rustString(str)).toBe('"cr\\r nul\0 bom﻿ rlo\\u{202e}"');
  expect(rubyString(str)).toBe('"cr\\r nul\\u{0} bom﻿ rlo‮"');
});

test('Ruby strings stay single-quoted without a CR or NUL, and never interpolate', () => {
  expect(rubyString("it's #{x} \\ end")).toBe("'it\\'s #{x} \\\\ end'");
  expect(rubyString('#{x} "q"\r')).toBe('"\\#{x} \\"q\\"\\r"');
});
