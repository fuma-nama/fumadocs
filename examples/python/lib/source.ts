import { dynamicLoader } from 'fumadocs-core/source';
import { createPython } from 'fumadocs-python';

const python = createPython({
  file: './httpx.json',
});

const pythonLoader = dynamicLoader(python.dynamicSource(), {
  baseUrl: '/docs',
  plugins: [python.loaderPlugin()],
});

export function getSource() {
  return pythonLoader.get();
}
