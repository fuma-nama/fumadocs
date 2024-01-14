/**
 * @type {import("@fuma-docs/openapi").Config}
 */
module.exports = {
  input: ['./petstore.yaml'],
  output: './content/docs/headless',
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
