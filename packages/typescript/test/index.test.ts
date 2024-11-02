import { expect, test } from 'vitest';
import { generateDocumentation } from '@/generate/base';

test('class members', () => {
  const out = generateDocumentation(
    'index.ts',
    'MyClass',
    `
    export class MyClass {
        #name: string;
        private test: string;
        age: number;
        
        constructor(name: string) { 
            this.#name = name;
        }
    }
    `,
  );

  expect(out).toMatchInlineSnapshot(`
    [
      {
        "description": "",
        "entries": [
          {
            "description": "",
            "name": "test",
            "tags": {},
            "type": "string",
          },
          {
            "description": "",
            "name": "age",
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
  const out = generateDocumentation(
    'index.ts',
    'MyInterface',
    `
    export interface MyInterface {
        "#name": string;
        age: number
    }
    `,
  );

  expect(out).toMatchInlineSnapshot(`
    [
      {
        "description": "",
        "entries": [
          {
            "description": "",
            "name": "#name",
            "tags": {},
            "type": "string",
          },
          {
            "description": "",
            "name": "age",
            "tags": {},
            "type": "number",
          },
        ],
        "name": "MyInterface",
      },
    ]
  `);
});
