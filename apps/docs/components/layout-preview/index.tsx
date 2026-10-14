'use client';
import { lazy } from 'react';

// only rendered in frames, pages with the stories don't load them
export const DocsLayoutPreview = lazy(() =>
  import('./docs').then((mod) => ({ default: mod.DocsLayoutPreview })),
);
export const NotebookLayoutPreview = lazy(() =>
  import('./notebook').then((mod) => ({ default: mod.NotebookLayoutPreview })),
);
export const SpaciousLayoutPreview = lazy(() =>
  import('./spacious').then((mod) => ({ default: mod.SpaciousLayoutPreview })),
);
export const FluxLayoutPreview = lazy(() =>
  import('./flux').then((mod) => ({ default: mod.FluxLayoutPreview })),
);
export const GlassLayoutPreview = lazy(() =>
  import('./glass').then((mod) => ({ default: mod.GlassLayoutPreview })),
);
export const HomeLayoutPreview = lazy(() =>
  import('./home').then((mod) => ({ default: mod.HomeLayoutPreview })),
);
