'use client';
import { inputToString } from '@/utils/input-to-string';
import type { RequestData } from '@/requests/_shared';

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

export const defaultAdapters = {
  'application/json': {
    encode(data) {
      return JSON.stringify(data.body);
    },
    generateExample(data, ctx) {
      return str(data.body, 'json', ctx);
    },
  },
  'application/xml': {
    async encode(data) {
      // @ts-expect-error -- untyped
      const { js2xml } = await import('xml-js/lib/js2xml');

      return js2xml(data.body as Record<string, unknown>, {
        compact: true,
        spaces: 2,
      });
    },
    generateExample(data, ctx) {
      return str(data.body, 'xml', ctx);
    },
  },
  'application/x-ndjson': {
    encode(data) {
      if (Array.isArray(data.body)) {
        return data.body.map((v) => JSON.stringify(v)).join('\n');
      }
      return JSON.stringify(data.body);
    },
    generateExample(data, ctx) {
      return str(data.body, 'ndjson', ctx);
    },
  },
  'application/x-www-form-urlencoded': {
    encode(data) {
      if (typeof data.body !== 'object')
        throw new Error(
          `Input value must be object, received: ${typeof data.body}`,
        );

      const params = new URLSearchParams();
      for (const key in data.body) {
        params.set(key, String(data.body[key as keyof object]));
      }

      return params;
    },
    generateExample(data, ctx) {
      if (ctx.lang === 'js') {
        return `const body = new URLSearchParams(${JSON.stringify(data.body, null, 2)})`;
      }

      return str(data.body, 'url', ctx);
    },
  },
  'multipart/form-data': {
    encode(data) {
      const formData = new FormData();
      const body = data.body as Record<string, unknown>;

      if (typeof body !== 'object' || !body) {
        throw new Error(
          `Unsupported body type: ${typeof body}, expected: object`,
        );
      }

      for (const key in body) {
        const prop = body[key];

        if (typeof prop === 'object' && prop instanceof File) {
          formData.set(key, prop);
        }

        if (Array.isArray(prop) && prop.every((item) => item instanceof File)) {
          for (const item of prop) {
            formData.append(key, item);
          }
        }

        if (prop && !(prop instanceof File)) {
          formData.set(key, JSON.stringify(prop));
        }
      }

      return formData;
    },
    generateExample(data, ctx) {
      if (ctx.lang === 'python') {
        return `body = ${JSON.stringify(data.body, null, 2)}`;
      }

      const s: string[] = [];
      if (ctx.lang === 'js') {
        s.push(`const body = new FormData();`);

        for (const [key, value] of Object.entries(data.body as object)) {
          s.push(`body.set(${key}, ${inputToString(value)})`);
        }
      }

      if (ctx.lang === 'go' && 'addImport' in ctx) {
        ctx.addImport('mime/multipart');
        ctx.addImport('bytes');

        s.push('body := new(bytes.Buffer)');
        s.push('mp := multipart.NewWriter(payload)');

        for (const [key, value] of Object.entries(data.body as object)) {
          s.push(
            `mp.WriteField("${key}", ${inputToString(value, 'json', 'backtick')})`,
          );
        }
      }

      if (s.length > 0) return s.join('\n');
    },
  },
  'application/octet-stream': {
    encode(data) {
      return data.body as BodyInit;
    },
    generateExample() {
      // not supported
      return undefined;
    },
  },
} satisfies Record<string, MediaAdapter>;

function str(
  init: unknown,
  format: 'xml' | 'json' | 'url' | 'ndjson',
  ctx: MediaContext,
) {
  if (ctx.lang === 'js') {
    if (format === 'json') {
      return `const body = JSON.stringify(${JSON.stringify(init, null, 2)})`;
    }
    return `const body = ${inputToString(init, format, 'backtick')}`;
  }

  if (ctx.lang === 'python') {
    if (format === 'json') return `body = ${JSON.stringify(init, null, 2)}`;
    return `body = ${inputToString(init, format, 'python')}`;
  }

  if (ctx.lang === 'go' && 'addImport' in ctx) {
    ctx.addImport('strings');

    return `body := strings.NewReader(${inputToString(init, format, 'backtick')})`;
  }
}
