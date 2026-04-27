import type { JSONContent } from '@tiptap/react';

export function serializeEditorSnapshot(json: JSONContent) {
  return JSON.stringify(json, null, 2);
}
