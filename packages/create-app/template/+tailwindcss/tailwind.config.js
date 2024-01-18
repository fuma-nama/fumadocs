const { createPreset } = require('@fuma-docs/ui/tailwind-plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
    './mdx-components.{ts,tsx}',
    './node_modules/@fuma-docs/ui/dist/**/*.js',
  ],
  presets: [createPreset()],
};
