/**
 * @type {import("fumadocs-openapi").Config}
 */
module.exports = {
  input: ['./museum.yaml'],
  output: './content/docs/ui',
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
