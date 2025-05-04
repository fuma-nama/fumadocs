'use client';
import { inputToString } from '@/utils/input-to-string';
import type { MediaAdapter, MediaContext } from '@/media/adapter';

export const json: MediaAdapter = {
  encode(data) {
    return JSON.stringify(data.body);
  },
  generateExample(data, ctx) {
    return str(data.body, 'json', ctx);
  },
};
export const xml: MediaAdapter = {
  async encode(data) {
    const { js2xml } = await import('xml-js');

    return js2xml(data.body as Record<string, unknown>, {
      compact: true,
      spaces: 2,
    });
  },
  generateExample(data, ctx) {
    return str(data.body, 'xml', ctx);
  },
};

export const url: MediaAdapter = {
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
};

export const formData: MediaAdapter = {
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
};

function str(init: unknown, format: 'xml' | 'json' | 'url', ctx: MediaContext) {
  if (ctx.lang === 'js') {
    if (format === 'json') {
      return `const body = JSON.stringify(${JSON.stringify(init, null, 2)})`;
    }
    return `const body = ${inputToString(init, format, 'backtick')}`;
  }
  if (ctx.lang === 'python') {
    return `body = ${inputToString(init, format, 'python')}`;
  }
  if (ctx.lang === 'go' && 'addImport' in ctx) {
    ctx.addImport('strings');

    return `body := strings.NewReader(${inputToString(init, format, 'backtick')})`;
  }
}
