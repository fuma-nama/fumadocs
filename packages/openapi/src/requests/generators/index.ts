import type { MediaAdapter } from '../media/adapter';
import type { RequestData } from '../types';

export interface CodeUsageGeneratorRegistry {
  add: (id: string, generator: CodeUsageGenerator) => void;
  get: (id: string) => CodeUsageGenerator | undefined;
  addInline: (generator: InlineCodeUsageGenerator) => void;
  /**
   * @returns if the generator is removed
   */
  remove: (id: string) => boolean;
  map: () => Map<string, CodeUsageGenerator>;
}

/**
 * Generate code example for given programming language
 */
export interface CodeUsageGenerator {
  generate: CodeUsageGeneratorFn;
  lang: string;
  label?: string;

  /**
   * for inline generators passed from server, this stores info available for client (e.g. forwarded from "use client").
   */
  _client?: {
    generate: string | CodeUsageGeneratorFn;
    serverContext?: unknown;
  };
}

/**
 * Generate code example for given programming language
 */
export interface InlineCodeUsageGenerator<T = unknown> {
  id?: string;
  lang: string;
  label?: string;
  /**
   * either:
   * - code
   * - a function imported from a file with "use client" directive
   * - false (disabled)
   */
  source?: string | CodeUsageGeneratorFn<T> | false;

  /**
   * Pass extra context to client-side source generator
   */
  serverContext?: T;
}

export function createCodeUsageGeneratorRegistry(
  inherit?: CodeUsageGeneratorRegistry,
): CodeUsageGeneratorRegistry {
  const registry = new Map<string, CodeUsageGenerator>(inherit?.map());

  return {
    add(id, generator) {
      registry.set(id, generator);
    },
    get(id) {
      return registry.get(id);
    },
    addInline(generator) {
      const source = generator.source;
      const id = generator.id ?? generator.lang;
      if (!source) {
        this.remove(id);
        return;
      }

      registry.set(id, {
        lang: generator.lang,
        label: generator.label,
        generate() {
          return typeof source === 'string' ? source : '';
        },
        _client: {
          generate: source,
          serverContext: generator.serverContext,
        },
      });
    },
    remove(id) {
      return registry.delete(id);
    },
    map() {
      return registry;
    },
  };
}

export type CodeUsageGeneratorFn<ServerContext = unknown> = (
  url: string,
  data: RequestData,
  context: {
    mediaAdapters: Record<string, MediaAdapter>;
    server: ServerContext;
  },
) => string;
