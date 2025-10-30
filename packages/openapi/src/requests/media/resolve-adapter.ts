import type { MediaAdapter } from './adapter';

const VariantMediaTypeRegex =
  /^(?<dir>[a-zA-Z0-9._-]+)\/(?<content>[a-zA-Z0-9._-]+)\+(?<variant>[a-zA-Z0-9._-]+)$/;

/**
 * Resolve a media adapter for a given media type.
 * Supports exact matches and pattern matching (e.g., +json suffix).
 *
 * @param mediaType - The media type to resolve (e.g., "application/json", "application/json-patch+json")
 * @param adapters - Record of media adapters
 * @returns The resolved adapter or undefined if not found
 */
export function resolveMediaAdapter(
  mediaType: string,
  adapters: Record<string, MediaAdapter>,
): MediaAdapter | undefined {
  // Normalize media type (remove parameters like charset)
  const normalized = mediaType.split(';', 2)[0].trim().toLowerCase();

  if (normalized in adapters) {
    return adapters[normalized];
  }

  const match = VariantMediaTypeRegex.exec(normalized);
  if (match?.groups) {
    const baseType = `${match.groups.dir}/${match.groups.variant}`;

    if (baseType in adapters) {
      return adapters[baseType];
    }
  }
}

/**
 * Check if a media type is supported by the given adapters.
 *
 * @param mediaType - The media type to check
 * @param adapters - Record of media adapters
 * @returns true if the media type is supported
 */
export function isMediaTypeSupported(
  mediaType: string,
  adapters: Record<string, MediaAdapter>,
): boolean {
  return resolveMediaAdapter(mediaType, adapters) !== undefined;
}
