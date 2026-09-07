import type { AnyFeature } from '.';
import { docs } from './docs';
import { ai } from './ai';
import { llms } from './llms';
import { og } from './og';
import { oramaCloud } from './orama-cloud';
import { epub } from './epub';
import { lint } from './lint';

export const features: AnyFeature[] = [docs, ai, llms, og, oramaCloud, epub, lint];
