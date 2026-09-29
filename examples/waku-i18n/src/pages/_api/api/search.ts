import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

// zero config: the default `multilingual` mode works for every language
export const { GET } = createFromSource(source);
