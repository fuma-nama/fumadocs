const { docsUi, docsUiPlugins } = require('@fuma-docs/ui/tailwind-plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './node_modules/@fuma-docs/ui/dist/**/*.js',
  ],
  plugins: [...docsUiPlugins, docsUi],
};
