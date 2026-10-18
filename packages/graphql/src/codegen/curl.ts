import { shellQuote } from 'shared-api/codegen';
import type { CodeUsageGenerator } from '@/codegen';

export const curl: CodeUsageGenerator = {
  label: 'cURL',
  lang: 'bash',
  generate({ url, query, variables, headers }) {
    let out = `curl -X POST ${shellQuote(url)} \\\n  -H 'Content-Type: application/json'`;
    for (const name in headers) out += ` \\\n  -H ${shellQuote(`${name}: ${headers[name]}`)}`;
    return `${out} \\\n  -d ${shellQuote(JSON.stringify({ query, variables }, null, 2))}`;
  },
};
