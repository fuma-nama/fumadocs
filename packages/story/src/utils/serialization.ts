// serialize & deserialize JSON-compatible but recursive data
import { parse, stringify } from "@ungap/structured-clone/json";

export function serialize(value: unknown): string {
  return stringify(value);
}

export function deserialize(value: string): unknown {
  return parse(value);
}
