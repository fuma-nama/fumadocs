import type { PluginOption } from 'vite';
import { crawlFrameworkPkgs } from 'vitefu';

export default function press(): PluginOption {
  return pressCore();
}

function pressCore(): PluginOption {
  return {
    name: 'fumapress:core',
    async config(_, { command }) {
      const out = await crawlFrameworkPkgs({
        root: process.cwd(),
        isBuild: command === 'build',
        isFrameworkPkgByName(pkgName) {
          if (
            pkgName.startsWith('@fumapress/') ||
            pkgName.startsWith('@fumadocs/') ||
            pkgName.startsWith('fumadocs-')
          )
            return true;
        },
      });

      return {
        ssr: {
          noExternal: out.ssr.noExternal,
          external: ['@takumi-rs/image-response'],
        },
        optimizeDeps: out.optimizeDeps,
      };
    },
    async resolveId(source, importer, options) {
      if (source === 'virtual:fumapress-core/config') {
        return this.resolve('/press.config', importer, options);
      }

      const match = /^virtual:root\.css(\?.*)?$$/.exec(source);

      if (match) {
        const query = match[1] ?? '';
        const out = await this.resolve(`/src/app.css${query}`, importer, options);
        if (out === null)
          return this.resolve(`@fumapress/core/css/default.css${query}`, importer, options);
        return out;
      }
    },
    load(id) {
      if (id === '\0virtual:vite-rsc-waku/server-entry-inner') {
        return getManagedServerEntry();
      }
    },
  };
}

function getManagedServerEntry() {
  return `import adapter from 'waku/adapters/default';
import pressConfig from 'virtual:fumapress-core/config';
import { createRouter } from '@fumapress/core/router';

const router = createRouter(pressConfig);

export default adapter(router.createPages());
`;
}
