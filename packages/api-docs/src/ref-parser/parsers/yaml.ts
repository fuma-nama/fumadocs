import { JSON_SCHEMA, load } from 'js-yaml';
import type { FileInfo, Plugin } from '../types/index.js';
import { ParserError } from '../util/errors.js';

export default {
  /**
   * The order that this parser will run, in relation to other parsers.
   */
  order: 200,

  /**
   * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
   */
  allowEmpty: true,

  /**
   * Determines whether this parser can parse a given file reference.
   * Parsers that match will be tried, in order, until one successfully parses the file.
   * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
   * every parser will be tried.
   */
  canParse: ['.yaml', '.yml', '.json'], // JSON is valid YAML

  /**
   * Parses the given file as YAML
   */
  async parse(file: FileInfo) {
    let data = file.data;
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }

    if (typeof data === 'string') {
      try {
        return load(data, { schema: JSON_SCHEMA });
      } catch {
        try {
          return load(data);
        } catch (e: unknown) {
          throw new ParserError(e instanceof Error ? e.message : 'Parser Error', file.url);
        }
      }
    }

    return data;
  },
} as Plugin;
