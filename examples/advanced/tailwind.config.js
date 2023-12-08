const { docsUi, docsUiPlugins } = require('next-docs-ui/tailwind-plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './node_modules/next-docs-ui/dist/**/*.js'
  ],
  plugins: [...docsUiPlugins, docsUi]
}
