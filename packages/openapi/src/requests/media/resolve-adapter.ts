import type { MediaAdapter } from './adapter';

const VariantMediaTypeRegex =
  /^(?<dir>[a-zA-Z0-9._-]+)\/(?<content>[a-zA-Z0-9._-]+)\+(?<variant>[a-zA-Z0-9._-]+)$/;

/**
 * Resolve the media type of the adapter for a given media type, like `application/json` for `+json` variants.
 */
export function resolveMediaType(
  mediaType: string,
  adapters: Record<string, MediaAdapter>,
): string | undefined {
  // Normalize media type (remove parameters like charset)
  const normalized = mediaType.split(';', 2)[0].trim().toLowerCase();

  if (normalized in adapters) {
    return normalized;
  }

  const match = VariantMediaTypeRegex.exec(normalized);
  if (match?.groups) {
    const baseType = `${match.groups.dir}/${match.groups.variant}`;

    if (baseType in adapters) {
      return baseType;
    }
  }
}

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
  const type = resolveMediaType(mediaType, adapters);
  if (type) return adapters[type];
}
