import { describe, expect, test } from 'vitest';
import { generateRequestSnippets } from '@/utils/snippets';

describe('generateRequestSnippets', () => {
  test('query with variables & url, single quotes escaped', () => {
    const snippets = generateRequestSnippets({
      url: 'https://api.example.com/graphql',
      query: 'query Customer($id: ID!) {\n  customer(id: $id) {\n    name\n  }\n}',
      variables: { id: '1', note: "it's urgent" },
    });

    expect(snippets).toMatchInlineSnapshot(`
      [
        {
          "code": "curl -X POST \\
        'https://api.example.com/graphql' \\
        -H 'Content-Type: application/json' \\
        -d '{
        "query": "query Customer($id: ID!) {\\n  customer(id: $id) {\\n    name\\n  }\\n}",
        "variables": {
          "id": "1",
          "note": "it'\\''s urgent"
        }
      }'",
          "id": "curl",
          "lang": "bash",
        },
        {
          "code": "const query = \`
      query Customer($id: ID!) {
        customer(id: $id) {
          name
        }
      }\`;

      const variables = {
        "id": "1",
        "note": "it's urgent"
      };

      const response = await fetch('https://api.example.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });

      const { data } = await response.json();",
          "id": "js",
          "lang": "js",
        },
      ]
    `);
  });

  test('query without url or variables, placeholder used', () => {
    const snippets = generateRequestSnippets({
      query: 'query Orders {\n  orders {\n    id\n  }\n}',
    });

    expect(snippets).toMatchInlineSnapshot(`
      [
        {
          "code": "curl -X POST \\
        'https://your-api/graphql' \\
        -H 'Content-Type: application/json' \\
        -d '{
        "query": "query Orders {\\n  orders {\\n    id\\n  }\\n}"
      }'",
          "id": "curl",
          "lang": "bash",
        },
        {
          "code": "const query = \`
      query Orders {
        orders {
          id
        }
      }\`;

      const response = await fetch('https://your-api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const { data } = await response.json();",
          "id": "js",
          "lang": "js",
        },
      ]
    `);
  });
});
