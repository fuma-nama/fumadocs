/**
 * Internal JSON Pointer locations that MUST remain Reference Objects in AsyncAPI 3.0.
 *
 * @see https://github.com/asyncapi/bundler#dereference-of-the-external-references
 */
const mandatoryAsyncApiV3RefPatterns = [
  /^#\/channels\/.*\/servers(?:\/|$)/,
  /^#\/operations\/.*\/channel(?:\/|$)/,
  /^#\/operations\/.*\/messages(?:\/|$)/,
  /^#\/operations\/.*\/reply\/channel(?:\/|$)/,
  /^#\/operations\/.*\/reply\/messages(?:\/|$)/,
  /^#\/components\/channels\/.*\/servers(?:\/|$)/,
  /^#\/components\/operations\/.*\/channel(?:\/|$)/,
  /^#\/components\/operations\/.*\/messages(?:\/|$)/,
  /^#\/components\/operations\/.*\/reply\/channel(?:\/|$)/,
  /^#\/components\/operations\/.*\/reply\/messages(?:\/|$)/,
] as const;

export function isMandatoryAsyncApiV3Ref(pointer: string): boolean {
  return mandatoryAsyncApiV3RefPatterns.some((pattern) => pattern.test(pointer));
}
