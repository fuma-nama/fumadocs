/** @type {import("prettier").Config} */
module.exports = {
  semi: false,
  tailwindFunctions: ['clsx', 'cn'],
  singleQuote: true,
  trailingComma: 'none',
  arrowParens: 'avoid',
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss'
  ],
  proseWrap: 'always'
}
