'use client';
import { createDynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core';
import { highlighter } from '@/lib/highlighter';

export const DynamicCodeBlock = createDynamicCodeBlock({ highlighter });
