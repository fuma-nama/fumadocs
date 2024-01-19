const { docsUi, docsUiPlugins } = require('fumadocs-ui/tailwind-plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './node_modules/fumadocs-ui/dist/**/*.js',
  ],
  plugins: [...docsUiPlugins, docsUi],
};
