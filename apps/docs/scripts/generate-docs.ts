import { generateFiles } from 'fumadocs-openapi';

void generateFiles({
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
});
