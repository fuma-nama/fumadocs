import { TemplatePlugin } from '@/create-app';
import { copy } from '@/utils';
import path from 'node:path';
import { sourceDir } from '@/constants';

const oramaCloud: TemplatePlugin = {
  async afterWrite({ dest, template, options }) {
    const baseDir = path.join(dest, options.useSrcDir ? 'src' : '.');
    await copy(
      path.join(sourceDir, 'template/+orama-cloud/search.tsx'),
      path.join(baseDir, template.componentsDir, 'search.tsx'),
    );

    await copy(
      path.join(sourceDir, `template/+orama-cloud/${template.value}`),
      baseDir,
    );
  },
};

export default oramaCloud;
