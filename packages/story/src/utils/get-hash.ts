import { createHash } from "node:crypto";

export function getHash(v: string) {
  return createHash("SHA-256").update(v).digest("hex").slice(0, 32);
}
