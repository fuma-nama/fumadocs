import { expect, test } from 'vitest';
import { createGenerator } from '@/lib/base';

const generator = createGenerator();

test('class members', () => {
  const out = generator.generateDocumentation(
    {
      path: 'index.ts',
      content: `
    export class MyClass {
        #name: string;
        private test: string;
        age: number;
        
        constructor(name: string) { 
            this.#name = name;
        }
    }
    `,
    },
    'MyClass',
  );

  expect(out).toMatchInlineSnapshot(`
    [
      {
        "description": "",
        "entries": [
          {
            "deprecated": false,
            "description": "",
            "name": "test",
            "required": true,
            "tags": {},
            "type": "string",
          },
          {
            "deprecated": false,
            "description": "",
            "name": "age",
            "required": true,
            "tags": {},
            "type": "number",
          },
        ],
        "name": "MyClass",
      },
    ]
  `);
});

test('interface members', () => {
  const out = generator.generateDocumentation(
    {
      path: 'index.ts',
      content: `
    export interface MyInterface {
        "#name": string;
        age: number
    }
    `,
    },
    'MyInterface',
  );

  expect(out).toMatchInlineSnapshot(`
    [
      {
        "description": "",
        "entries": [
          {
            "deprecated": false,
            "description": "",
            "name": "#name",
            "required": true,
            "tags": {},
            "type": "string",
          },
          {
            "deprecated": false,
            "description": "",
            "name": "age",
            "required": true,
            "tags": {},
            "type": "number",
          },
        ],
        "name": "MyInterface",
      },
    ]
  `);
});
