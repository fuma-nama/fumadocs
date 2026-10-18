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
        generate: typeof source === 'string' ? () => source : source,
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

/** escapes a character with a backslash, CR and NUL as escape sequences */
function backslash(c: string): string {
  return c === '\r' ? '\\r' : c === '\0' ? '\\000' : `\\${c}`;
}

/** content of a Python triple-quoted string or Java text block, quotes are escaped where they'd close it */
function escapeTripleQuotes(str: string): string {
  return str.replace(/[\\\r\0]|"(?=""|$)/g, backslash);
}

/** a Python triple-quoted string */
export function pythonString(str: string): string {
  return `"""${escapeTripleQuotes(str)}"""`;
}

/**
 * A Java text block, escapes keep the white space Java strips from each line.
 *
 * A final line break puts the closing delimiter on its own line.
 */
export function javaTextBlock(str: string): string {
  // oxlint-disable-next-line no-control-regex -- Java also strips U+001C to U+001F
  const content = escapeTripleQuotes(str).replace(/(?:[^\S\n]|[\x1c-\x1f])(?=\n)/g, (c) =>
    c === ' ' ? '\\s' : `${c}\\n\\`,
  );
  // a closing delimiter on its own line keeps the indent, the `\` joining it the trailing white space
  // oxlint-disable-next-line no-control-regex
  return !str.endsWith('\n') && /^[\s\x1c-\x1f]|[\s\x1c-\x1f]$/.test(str)
    ? `"""\n${content}\\\n"""`
    : `"""\n${content}"""`;
}

/** a JavaScript template literal */
export function jsTemplateLiteral(str: string): string {
  return `\`${str.replace(/[\\`\r]|\$\{/g, backslash)}\``;
}

// characters Go raw strings can't hold
const goEscapes: Record<string, string> = {
  '`': '"`"',
  '\r': '"\\r"',
  '\0': '"\\x00"',
  '\uFEFF': '"\\uFEFF"',
};

/** a Go raw string, the characters it can't hold are concatenated as interpreted strings */
export function goString(str: string): string {
  return `\`${str.replace(/[`\r\0\uFEFF]/g, (c) => `\` + ${goEscapes[c]} + \``)}\``;
}

const rustEscapes: Record<string, string> = { '\\': '\\\\', '"': '\\"', '\r': '\\r', '\t': '\\t' };

/** a Rust string with escapes, rustc rejects text direction controls in literals */
export function rustEscapedString(str: string): string {
  const escaped = str.replace(
    /[\\"\r\t\u202a-\u202e\u2066-\u2069]/g,
    (c) => rustEscapes[c] ?? `\\u{${c.charCodeAt(0).toString(16)}}`,
  );
  return `"${escaped}"`;
}

/** a Rust raw string with enough `#` to hold `"#`, escaped for the CRs and text direction controls it can't hold */
export function rustString(str: string): string {
  if (/[\r\u202a-\u202e\u2066-\u2069]/.test(str)) return rustEscapedString(str);

  let hashes = '#';
  while (str.includes(`"${hashes}`)) hashes += '#';
  return `r${hashes}"${str}"${hashes}`;
}

/** a C# raw string literal, the delimiter is longer than every run of quotes inside */
export function csharpRawString(str: string): string {
  let quotes = '"""';
  while (str.includes(quotes)) quotes += '"';
  return `${quotes}\n${str}\n${quotes}`;
}

/** single quotes keep the string literal, each `'` closes them to add an escaped quote */
export function shellQuote(str: string): string {
  return `'${str.replaceAll("'", `'\\''`)}'`;
}
