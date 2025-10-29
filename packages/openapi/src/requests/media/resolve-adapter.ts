import type { MediaAdapter } from './adapter';

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
    const normalized = mediaType.split(';')[0].trim().toLowerCase();

    // 1. Try exact match first
    if (normalized in adapters) {
        return adapters[normalized];
    }

    // 2. Try pattern matching for structured syntax suffixes (RFC 6839)
    // Handle +json, +xml, etc.
    if (normalized.includes('+')) {
        const suffix = normalized.substring(normalized.lastIndexOf('+'));

        // Check if we have a base adapter for this suffix
        // e.g., application/merge-patch+json -> application/json
        const baseType = `application/${suffix.slice(1)}`;
        if (baseType in adapters) {
            return adapters[baseType];
        }
    }

    return undefined;
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

