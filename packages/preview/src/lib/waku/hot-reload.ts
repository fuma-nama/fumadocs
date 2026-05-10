import { z } from 'zod';

const OnClearCacheSchema = z.object({
  type: z.literal('clear-cache'),
  absolutePath: z.string(),
});

const OnRevalidateSchema = z.object({
  type: z.literal('revalidate'),
});

export const WebSocketEventSchema = z.discriminatedUnion('type', [
  OnClearCacheSchema,
  OnRevalidateSchema,
]);

// TypeScript type inferred from the schema (equivalent to your original union)
export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
export type OnClearCache = z.infer<typeof OnClearCacheSchema>;
export type OnRevalidate = z.infer<typeof OnRevalidateSchema>;

export function encodeEvent(event: WebSocketEvent) {
  return JSON.stringify(event);
}

export function decodeEvent(event: string): WebSocketEvent | undefined {
  try {
    return WebSocketEventSchema.safeParse(JSON.parse(event)).data;
  } catch {
    return;
  }
}
