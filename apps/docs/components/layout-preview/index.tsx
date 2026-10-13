'use client';
import dynamic from 'next/dynamic';

// only rendered in frames, pages with the stories don't load them
export const DocsLayoutPreview = dynamic(() =>
  import('./docs').then((mod) => mod.DocsLayoutPreview),
);
export const NotebookLayoutPreview = dynamic(() =>
  import('./notebook').then((mod) => mod.NotebookLayoutPreview),
);
export const SpaciousLayoutPreview = dynamic(() =>
  import('./spacious').then((mod) => mod.SpaciousLayoutPreview),
);
export const FluxLayoutPreview = dynamic(() =>
  import('./flux').then((mod) => mod.FluxLayoutPreview),
);
export const GlassLayoutPreview = dynamic(() =>
  import('./glass').then((mod) => mod.GlassLayoutPreview),
);
export const HomeLayoutPreview = dynamic(() =>
  import('./home').then((mod) => mod.HomeLayoutPreview),
);
