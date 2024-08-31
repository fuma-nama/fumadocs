import { expect, test } from 'vitest';
import { z } from 'zod';
import { formatError } from '@/utils/format-error';

test('format errors', () => {
  const schema = z.object({
    text: z.string(),
    obj: z.object({
      key: z.number(),
    }),
    value: z.string().max(4),
  });

  const result = schema.safeParse({
    text: 4,
    obj: {},
    value: 'asfdfsdfsdfsd',
  });

  if (result.error)
    expect(formatError('index.mdx', result.error)).toMatchInlineSnapshot(`
      "in index.mdx:
        text: Expected string, received number
        obj: 
          obj.key: Required
        value: String must contain at most 4 character(s)"
    `);
});
