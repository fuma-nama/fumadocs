import { jsTemplateLiteral } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

export const javascript: CodeUsageGenerator = {
  label: 'JavaScript',
  lang: 'js',
  generate({ url, query, variables, headers }) {
    let out = `const query = ${jsTemplateLiteral(query)};\n\n`;
    if (variables) out += `const variables = ${JSON.stringify(variables, null, 2)};\n\n`;
    const init = JSON.stringify({ 'Content-Type': 'application/json', ...headers }, null, 2);

    return `${out}const response = await fetch(${JSON.stringify(url)}, {
  method: "POST",
  headers: ${init.replaceAll('\n', '\n  ')},
  body: JSON.stringify({ ${variables ? 'query, variables' : 'query'} }),
});

console.log(await response.json());`;
  },
};
