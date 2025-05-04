import type { RequestData } from '@/requests/_shared';
import * as adapters from './adapter.client';

interface GoContext {
  lang: 'go';
  addImport: (name: string) => void;
}

interface JavaScriptContext {
  lang: 'js';
  addImport: (pkg: string, name: string) => void;
}

export type MediaContext =
  | GoContext
  | JavaScriptContext
  | {
      lang: string;
      /**
       * Passed by your custom example generator, for your custom media adapter to receive.
       */
      customData?: Record<string, unknown>;
    };

export interface MediaAdapter {
  /**
   * encode request data into body for `fetch()`.
   *
   * Return the encoded form of `data.body` property.
   */
  encode: (data: RequestData) => BodyInit | Promise<BodyInit>;

  /**
   * generate code for usage examples in a given programming language.
   *
   * @param data - request data.
   * @param lang - name of programming language.
   * @param ctx - context passed from the generator of programming language.
   *
   * @returns code that inits a `body` variable, or undefined if not supported (skip example for that language).
   */
  generateExample: (data: RequestData, ctx: MediaContext) => string | undefined;
}

export const defaultAdapters: Record<string, MediaAdapter> = {
  'application/json': adapters.json,
  'application/xml': adapters.xml,
  'application/x-ndjson': adapters.ndJson,
  'application/x-www-form-urlencoded': adapters.url,
  'multipart/form-data': adapters.formData,
  'application/octet-stream': adapters.octet,
};
