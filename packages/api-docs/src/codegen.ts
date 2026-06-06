export interface CodeUsageGeneratorRegistry<Data = unknown, Context = unknown> {
  add: (id: string, generator: CodeUsageGenerator<Data, Context>) => void;
  get: (id: string) => CodeUsageGenerator<Data, Context> | undefined;
  addInline: (generator: InlineCodeUsageGenerator<Data, Context>) => void;
  /**
   * @returns if the generator is removed
   */
  remove: (id: string) => boolean;
  map: () => Map<string, CodeUsageGenerator<Data, Context>>;
}

/**
 * Generate code example for given programming language
 */
export interface CodeUsageGenerator<Data = unknown, Context = unknown> {
  generate: (data: Data, context: Context) => string;
  lang: string;
  label?: string;
}

/**
 * Generate code example for given programming language
 */
export interface InlineCodeUsageGenerator<Data = unknown, Context = unknown> {
  id?: string;
  lang: string;
  label?: string;
  /**
   * either:
   * - code
   * - a function imported from a file with "use client" directive
   * - false (disabled)
   */
  source?: string | CodeUsageGeneratorFn<Data, Context> | false;
}

export function createCodeUsageGeneratorRegistry<Data, Context>(
  inherit?: CodeUsageGeneratorRegistry<Data, Context>,
): CodeUsageGeneratorRegistry<Data, Context> {
  const registry = new Map<string, CodeUsageGenerator<Data, Context>>(inherit?.map());

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

type CodeUsageGeneratorFn<Data, Context> = (data: Data, context: Context) => string;
