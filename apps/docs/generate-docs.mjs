import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { generateTags } from '@fuma-docs/openapi';

const folder = resolve('./content/docs/ui/api');

generateTags('./petstore.yaml', {
  render(title, description) {
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
}).then((tags) => {
  tags.forEach(({ tag, content }) => {
    writeFileSync(join(folder, `${tag.toLowerCase()}.mdx`), content);
    console.log(`Generated page for ${tag}`);
  });
});
