'use client';
import { wrapLazy } from '../utils/lazy';

export const ClientLazy = wrapLazy(() => import('./client'));
