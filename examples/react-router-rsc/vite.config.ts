import { unstable_reactRouterRSC as reactRouterRSC } from '@react-router/dev/vite';
import rsc from '@vitejs/plugin-rsc';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin, type PluginOption } from 'vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';

// the client version reads a manifest of `@vitejs/plugin-rsc` that is not ready in `generateBundle` yet
// remove after the next React Router release: https://github.com/remix-run/react-router/pull/15672
function fixClientVersion(plugins: PluginOption[]) {
  for (const plugin of plugins) {
    if (
      plugin &&
      'generateBundle' in plugin &&
      plugin.name === 'react-router/rsc/virtual-client-version'
    ) {
      plugin.writeBundle = plugin.generateBundle as Plugin['writeBundle'];
      delete plugin.generateBundle;
    }
  }
  return plugins;
}

export default defineConfig({
  plugins: [fumadocsMdx(), tailwindcss(), fixClientVersion(reactRouterRSC()), rsc()],
  resolve: {
    tsconfigPaths: true,
  },
});
