import { createPreset } from './dist/tailwind-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [createPreset()],
};
