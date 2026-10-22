import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import type { WatchableSource } from '../../source';

interface Registry {
  sources: Set<WatchableSource>;
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
  registry.sources.add(source);
  // sources load lazily, so the server may already be running
  registry.server?.watcher.add(source.dir);
  const unsubscribe = source.onDependency((file) => registry.server?.watcher.add(file));

  return () => {
    registry.sources.delete(source);
    unsubscribe();
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
      // content directories & dependencies sit outside the module graph, Vite won't watch them otherwise
      for (const source of registry.sources) {
        server.watcher.add(source.dir);
        // replays the known dependencies
        source.onDependency((file) => server.watcher.add(file))();
      }

      const onChange = (file: string) => {
        const absolutePath = path.resolve(file);
        let changed = false;
        for (const source of registry.sources) {
          if (source.invalidateFile(absolutePath)) changed = true;
        }

        if (changed && reload) server.hot.send({ type: 'full-reload' });
      };

      for (const event of ['add', 'change', 'unlink'] as const) {
        server.watcher.on(event, onChange);
      }
    },
  };
}
