import { createPreset } from 'fumadocs-ui/tailwind-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx}', './src/render/**/*.{ts,tsx}'],
  presets: [createPreset()],
};
