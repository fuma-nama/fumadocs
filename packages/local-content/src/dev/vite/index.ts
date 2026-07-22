import path from 'node:path';
import picomatch, { type Matcher } from 'picomatch';
import type { Plugin, ViteDevServer } from 'vite';
import type { WatchableSource } from '../../source';

interface Registered {
  source: WatchableSource;
  matcher: Matcher;
}

interface Registry {
  sources: Set<Registered>;
  server?: ViteDevServer;
}

// the plugin runs in Vite's config graph, the source in the SSR graph, so they
// get separate instances of this module and need a process-wide registry
const REGISTRY_KEY = Symbol.for('fumadocs.local-content.vite-registry');

function getRegistry(): Registry {
  const holder = globalThis as typeof globalThis & { [REGISTRY_KEY]?: Registry };
  return (holder[REGISTRY_KEY] ??= { sources: new Set() });
}

/**
 * Keep a source in sync with Vite's watcher, needs {@link localContentPlugin}.
 */
export function watchWithVite(source: WatchableSource): () => void {
  const registry = getRegistry();
  const entry: Registered = { source, matcher: picomatch(source.include) };

  registry.sources.add(entry);
  // sources load lazily, so the server may already be running
  registry.server?.watcher.add(source.dir);

  return () => {
    registry.sources.delete(entry);
  };
}

export interface LocalContentPluginOptions {
  /**
   * Reload the browser after content changes. Content is read at runtime, not
   * imported, so there is no module for Vite to invalidate.
   *
   * @default true
   */
  reload?: boolean;
}

export function localContentPlugin({ reload = true }: LocalContentPluginOptions = {}): Plugin {
  return {
    name: 'fumadocs-local-content',
    apply: 'serve',
    configureServer(server) {
      const registry = getRegistry();
      registry.server = server;
      // content directories sit outside the module graph, Vite won't watch them otherwise
      for (const { source } of registry.sources) server.watcher.add(source.dir);

      const onChange = (file: string) => {
        const absolutePath = path.resolve(file);
        let changed = false;

        for (const { source, matcher } of registry.sources) {
          const relative = path.relative(source.dir, absolutePath);
          if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
          if (!matcher(relative)) continue;

          source.invalidateFile(absolutePath);
          changed = true;
        }

        if (changed && reload) server.hot.send({ type: 'full-reload' });
      };

      for (const event of ['add', 'change', 'unlink'] as const) {
        server.watcher.on(event, onChange);
      }

      return () => {
        registry.server = undefined;
      };
    },
  };
}
