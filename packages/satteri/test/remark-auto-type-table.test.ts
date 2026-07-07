import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compileMdx } from '@/compile';
import { applySatteriPreset } from '@/preset';
import { remarkAutoTypeTable } from '@/remark-auto-type-table';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function compile(source: string) {
  const options = await applySatteriPreset({
    preset: 'minimal',
    mdastPlugins: [
      remarkAutoTypeTable({
        // skip shiki in tests, render as plain hast text
        renderType: (type) => ({ type: 'text', value: type }),
        renderMarkdown: (md) => ({ type: 'text', value: md }),
      }),
    ],
  })('bundler');

  return compileMdx({ source, filePath: path.join(fixtures, 'page.mdx'), options });
}

describe('remark-auto-type-table', () => {
  it('generates a TypeTable with a compilable type prop', async () => {
    const { code } = await compile('<auto-type-table path="./type-table.ts" name="TestProps" />');

    expect(code).toMatchInlineSnapshot(`
      "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
      function _createMdxContent(props) {
          const { TypeTable } = props.components || {};
          if (!TypeTable) _missingMdxReference("TypeTable", true);
          return _jsx(TypeTable, {
              id: "type-table-type-table.ts-TestProps",
              type: {
                  "name": {
                      type: _jsx(_Fragment, { children: "string" }),
                      typeDescription: _jsx(_Fragment, { children: "string | undefined" }),
                      required: false,
                      default: _jsx(_Fragment, { children: "\\"hello\\"" }),
                      description: _jsx(_Fragment, { children: "The visible name." })
                  },
                  "enabled": {
                      type: _jsx(_Fragment, { children: "union" }),
                      typeDescription: _jsx(_Fragment, { children: "boolean" }),
                      required: true,
                      description: _jsx(_Fragment, { children: "Whether it is enabled" })
                  }
              }
          });
      }
      function MDXContent(props = {}) {
          const { wrapper: MDXLayout } = props.components || {};
          return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, { children: _jsx(_createMdxContent, props) })) : _createMdxContent(props);
      }
      export default MDXContent;
      function _missingMdxReference(id, component) {
          throw new Error("Expected " + (component ? "component" : "object") + " \`" + id + "\` to be defined: you likely forgot to import, pass, or provide it.");
      }
      "
    `);
  });

  it('propagates generator errors for unknown type names', async () => {
    await expect(
      compile('<auto-type-table path="./type-table.ts" name="DoesNotExist" />'),
    ).rejects.toThrow(/DoesNotExist/);
  });
});
