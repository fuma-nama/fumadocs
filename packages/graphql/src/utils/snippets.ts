const PlaceholderUrl = 'https://your-api/graphql';

export interface RequestSnippet {
  id: 'curl' | 'js';
  lang: string;
  code: string;
}

export interface GenerateRequestSnippetsInput {
  /**
   * the GraphQL endpoint, a placeholder is used when not provided.
   */
  url?: string;
  query: string;
  variables?: unknown;
}

/**
 * Generate deterministic HTTP request snippets (cURL & JavaScript `fetch`) for a GraphQL operation.
 */
export function generateRequestSnippets(input: GenerateRequestSnippetsInput): RequestSnippet[] {
  const { url = PlaceholderUrl, query, variables } = input;

  return [
    {
      id: 'curl',
      lang: 'bash',
      code: generateCurlSnippet(url, query, variables),
    },
    {
      id: 'js',
      lang: 'js',
      code: generateJsSnippet(url, query, variables),
    },
  ];
}

function generateCurlSnippet(url: string, query: string, variables: unknown): string {
  const body = JSON.stringify(variables === undefined ? { query } : { query, variables }, null, 2);

  return [
    'curl -X POST \\',
    `  ${shellQuote(url)} \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d ${shellQuote(body)}`,
  ].join('\n');
}

function generateJsSnippet(url: string, query: string, variables: unknown): string {
  const lines: string[] = [`const query = \`\n${escapeTemplateLiteral(query)}\`;`];

  if (variables !== undefined) {
    lines.push('', `const variables = ${JSON.stringify(variables, null, 2)};`);
  }

  lines.push(
    '',
    `const response = await fetch(${jsSingleQuote(url)}, {`,
    "  method: 'POST',",
    "  headers: { 'Content-Type': 'application/json' },",
    variables !== undefined
      ? '  body: JSON.stringify({ query, variables }),'
      : '  body: JSON.stringify({ query }),',
    '});',
    '',
    'const { data } = await response.json();',
  );

  return lines.join('\n');
}

/**
 * quote a shell argument in single quotes, embedded single quotes are escaped as `'\''`.
 */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function jsSingleQuote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function escapeTemplateLiteral(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${');
}
