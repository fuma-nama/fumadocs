import { pythonString } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

const constants: Record<string, string> = { true: 'True', false: 'False', null: 'None' };

export const python: CodeUsageGenerator = {
  label: 'Python',
  lang: 'python',
  generate({ url, query, variables, headers }) {
    let out = `import requests\n\nquery = ${pythonString(query)}\n\n`;
    if (variables) out += `variables = ${py(variables)}\n\n`;
    out += `response = requests.post(
    ${JSON.stringify(url)},
    json={"query": query${variables ? ', "variables": variables' : ''}},\n`;

    let dict = '';
    for (const name in headers) {
      dict += `${dict && ', '}${JSON.stringify(name)}: ${JSON.stringify(headers[name])}`;
    }
    if (dict) out += `    headers={${dict}},\n`;
    return `${out})\n\nprint(response.json())`;
  },
};

/** the Python literal of a JSON value */
function py(value: unknown): string {
  return JSON.stringify(value, null, 4).replace(
    /("(?:[^"\\]|\\.)*")|true|false|null/g,
    (match, str?: string) => str ?? constants[match],
  );
}
