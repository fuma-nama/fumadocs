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
            pkgName.startsWith('fumadocs-') ||
            pkgName === 'fumapress'
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
    async resolveId(source, _importer, options) {
      if (source === 'virtual:fumapress-core/config') {
        return this.resolve('/press.config', undefined, options);
      }

      if (source === 'virtual:root.css?inline') {
        return (
          (await this.resolve(`/src/app.css?inline`)) ??
          (await this.resolve(`fumapress/css/default.css?inline`))
        );
      }
    },
    async load(id) {
      if (id === '\0virtual:vite-rsc-waku/server-entry-inner') {
        return getManagedServerEntry();
      }
    },
  };
}

function getManagedServerEntry() {
  return `import adapter from 'waku/adapters/default';
import pressConfig from 'virtual:fumapress-core/config';
import { createRouter } from 'fumapress/router';

const router = createRouter(pressConfig);

export default adapter(router.createPages());
`;
}
