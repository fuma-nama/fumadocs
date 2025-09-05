import { expect, test } from 'vitest';
import { createGenerator, type GeneratorOptions } from '@/lib/base';
import { getSimpleForm } from '@/lib/get-simple-form';
import { createProject } from '@/create-project';
import { type Node, ts } from 'ts-morph';
import path from 'node:path';
import { fileURLToPath } from 'url';

const generator = createGenerator({
  cache: false,
});

const relative = (s: string): string =>
  path.resolve(fileURLToPath(new URL(s, import.meta.url)));

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
            "simplifiedType": "string",
            "tags": [],
            "type": "string",
          },
          {
            "deprecated": false,
            "description": "",
            "name": "age",
            "required": true,
            "simplifiedType": "number",
            "tags": [],
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
            "simplifiedType": "string",
            "tags": [],
            "type": "string",
          },
          {
            "deprecated": false,
            "description": "",
            "name": "age",
            "required": true,
            "simplifiedType": "number",
            "tags": [],
            "type": "number",
          },
        ],
        "name": "MyInterface",
      },
    ]
  `);
});

const tsconfig: GeneratorOptions = {
  tsconfigPath: relative('../tsconfig.json'),
  basePath: relative('../'),
  cache: false,
};

const project = createProject(tsconfig);

function getSimpleForms(fileName: string, sourceCode: string) {
  const out: string[] = [];
  const sourceFile = project.createSourceFile(fileName, sourceCode);
  const checker = project.getTypeChecker();

  function visit(node: Node) {
    if (node.isKind(ts.SyntaxKind.VariableDeclaration)) {
      const type = checker.getTypeAtLocation(node);

      out.push(`Raw: ${node.getText()}
Simplified: ${getSimpleForm(type, checker)}`);
    }

    node.forEachChild(visit);
  }

  visit(sourceFile);
  return out.join('\n\n');
}

test('get simple forms', async () => {
  const sourceCode = `
  class MyClass {}
  
  let x: string | number | null;
  let y: { a: number } | (() => void);
  let z: Array<string>;
  let w: [string, number, "test", false];
  let v: any;
  let r: MyClass | undefined | null;
`;

  expect(getSimpleForms('example.ts', sourceCode)).toMatchInlineSnapshot(`
    "Raw: x: string | number | null
    Simplified: number | string | null

    Raw: y: { a: number } | (() => void)
    Simplified: function | object

    Raw: z: Array<string>
    Simplified: array

    Raw: w: [string, number, "test", false]
    Simplified: [string, number, "test", false]

    Raw: v: any
    Simplified: any

    Raw: r: MyClass | undefined | null
    Simplified: object | null | undefined"
  `);
});
