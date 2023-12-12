const { docsUi, docsUiPlugins } = require('./dist/tailwind-plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [...docsUiPlugins, docsUi],
};
