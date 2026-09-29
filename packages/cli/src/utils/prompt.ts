import { isCancel as isCancelSymbol } from '@clack/prompts';

/**
 * `@clack/core` narrows to its own `unique symbol`, which can't exclude the wider `symbol` that
 * `@clack/prompts` returns, so a prompt result never narrows without this.
 */
export function isCancel<T>(value: T | symbol): value is symbol {
  return isCancelSymbol(value);
}
