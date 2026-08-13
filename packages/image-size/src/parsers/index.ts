import type { Parser } from '../types';
import { avif } from './avif';
import { bmp } from './bmp';
import { gif } from './gif';
import { ico } from './ico';
import { jpeg } from './jpeg';
import { png } from './png';
import { psd } from './psd';
import { svg } from './svg';
import { tiff } from './tiff';
import { webp } from './webp';

/**
 * Tried in order, first match wins. Signatures don't overlap, so the order only
 * decides which parser gets to reject a malformed file first.
 */
export const parsers: Parser[] = [avif, bmp, gif, ico, jpeg, png, psd, svg, tiff, webp];
