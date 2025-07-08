import { escapeString, inputToString } from '@/utils/input-to-string';
// @ts-expect-error -- untyped
import { js2xml } from 'xml-js/lib/js2xml';

interface BaseContext {
  /**
   * Passed by your custom example generator, for your custom media adapter to receive.
   */
  customData?: Record<string, unknown>;
}

interface GoContext extends BaseContext {
  lang: 'go';
  addImport: (name: string) => void;
}

interface JavaScriptContext extends BaseContext {
  lang: 'js';
  addImport: (pkg: string, name: string) => void;
}

interface JavaContext extends BaseContext {
  lang: 'java';
  addImport: (specifier: string) => void;
}

interface CSharpContext extends BaseContext {
  lang: 'csharp';
  addImport: (specifier: string) => void;
}

export type MediaContext =
  | JavaContext
  | GoContext
  | JavaScriptContext
  | CSharpContext
  | (BaseContext & { lang: string });

export interface MediaAdapter {
  /**
   * the same adapter that's passed from a client component.
   *
   * It is needed for client-side serialization of values.
   */
  client?: MediaAdapter;

  /**
   * encode data into specified media type for `fetch()`.
   *
   * Return the encoded form of `data.body` property.
   */
  encode: (data: { body: unknown }) => BodyInit;

  /**
   * generate code example for creating the body in a given programming language.
   *
   * @param data - request data.
   * @param lang - name of programming language.
   * @param ctx - context passed from the generator of programming language.
   *
   * @returns code that inits a `body` variable, or undefined if not supported (skip example for that language).
   */
  generateExample: (
    data: { body: unknown },
    ctx: MediaContext,
  ) => string | undefined;
}

export const defaultAdapters = {
  'application/json': {
    encode(data) {
      return JSON.stringify(data.body);
    },
    generateExample(data, ctx) {
      return str(data.body, 'application/json', ctx);
    },
  },
  'application/xml': {
    encode(data) {
      return js2xml(data.body as Record<string, unknown>, {
        compact: true,
        spaces: 2,
      });
    },
    generateExample(data, ctx) {
      return str(data.body, 'application/xml', ctx);
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
      return str(data.body, 'application/x-ndjson', ctx);
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

      return str(data.body, 'application/x-www-form-urlencoded', ctx);
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
          s.push(`body.set(${key}, ${JSON.stringify(inputToString(value))})`);
        }
      }

      if (ctx.lang === 'go') {
        const { addImport } = ctx as GoContext;
        addImport('mime/multipart');
        addImport('bytes');

        s.push('body := new(bytes.Buffer)');
        s.push('mp := multipart.NewWriter(payload)');

        for (const [key, value] of Object.entries(data.body as object)) {
          if (!value) continue;

          const escaped = escapeString(
            inputToString(value, 'application/json'),
            '`',
          );

          s.push(`mp.WriteField("${key}", ${escaped})`);
        }
      }

      if (ctx.lang === 'java') {
        const { addImport } = ctx as JavaContext;
        addImport('java.net.http.HttpRequest.BodyPublishers');

        s.push(`var body = BodyPublishers.ofByteArray(new byte[] { ... });`);
      }

      if (ctx.lang === 'csharp') {
        s.push(`var body = new MultipartFormDataContent();`);
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
  mediaType:
    | 'application/x-www-form-urlencoded'
    | 'application/x-ndjson'
    | 'application/json'
    | 'application/xml',
  ctx: MediaContext,
) {
  if (ctx.lang === 'js') {
    if (mediaType === 'application/json') {
      return `const body = JSON.stringify(${JSON.stringify(init, null, 2)})`;
    }
    return `const body = ${escapeString(inputToString(init, mediaType), '`')}`;
  }

  if (ctx.lang === 'python') {
    if (mediaType === 'application/json')
      return `body = ${JSON.stringify(init, null, 2)}`;

    return `body = ${escapeString(inputToString(init, mediaType), '"""')}`;
  }

  if (ctx.lang === 'go') {
    const { addImport } = ctx as GoContext;
    addImport('strings');
    return `body := strings.NewReader(${escapeString(inputToString(init, mediaType), '`')})`;
  }

  if (ctx.lang === 'java') {
    const { addImport } = ctx as JavaContext;
    addImport('java.net.http.HttpRequest.BodyPublishers');
    return `var body = BodyPublishers.ofString(${escapeString(inputToString(init, mediaType), '"""')});`;
  }

  if (ctx.lang === 'csharp') {
    const input = `\n${inputToString(init, mediaType)}\n`;

    return `var body = new StringContent(${escapeString(input, '"""')}, Encoding.UTF8, "${mediaType}");`;
  }
}
