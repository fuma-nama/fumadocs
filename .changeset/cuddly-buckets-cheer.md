---
'@fuma-docs/openapi': minor
---

**Support generating docs for OpenAPI schema**

In `openapi.config.js`:

```js
/**
 * @type {import("@fuma-docs/openapi").Config}
 */
module.exports = {
  input: ['./petstore.yaml'],
  output: './content/docs',
  per: 'tag',
  render: (title, description) => {
    return {
      frontmatter: [
        '---',
        `title: ${title}`,
        `description: ${description}`,
        'toc: false',
        '---',
      ].join('\n'),
    };
  },
};
```

Run `fuma-docs-openapi` to generate.