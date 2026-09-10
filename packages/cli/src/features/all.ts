import type { AnyFeature } from '.';
import { docs } from './docs';
import { ai } from './ai';
import { llms } from './llms';
import { og } from './og';
import { search } from './search';
import { mcp } from './mcp';
import { webmcp } from './webmcp';
import { feedback } from './feedback';
import { epub } from './epub';
import { lint } from './lint';

export const features: AnyFeature[] = [
  docs,
  ai,
  llms,
  mcp,
  webmcp,
  og,
  search,
  feedback,
  epub,
  lint,
];
