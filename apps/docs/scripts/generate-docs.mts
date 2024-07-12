import * as OpenAPI from 'fumadocs-openapi';
import * as Typescript from 'fumadocs-typescript';
import * as path from 'node:path';

void OpenAPI.generateFiles({
  input: ['./*.yaml'],
  output: './content/docs/ui',
  per: 'tag',
  renderer: {
    Root(props, child) {
      return OpenAPI.createElement(
        'Root',
        props,
        '<div className="bg-secondary p-4 rounded-lg">Demo Only</div>',
        ...child,
      );
    },
  },
});

const demoRegex = /^---type-table-demo---\r?\n(?<content>.+)\r?\n---end---$/gm;
void Typescript.generateFiles({
  input: ['./content/docs/**/*.model.mdx'],
  transformOutput(_, content) {
    return content.replace(demoRegex, '---type-table---\n$1\n---end---');
  },
  output: (file) =>
    path.resolve(
      path.dirname(file),
      `${path.basename(file).split('.')[0]}.mdx`,
    ),
});
