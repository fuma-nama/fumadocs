module.exports = {
  semi: false,
  tailwindFunctions: ['clsx', 'cn'],
  singleQuote: true,
  trailingComma: 'none',
  arrowParens: 'avoid',
  plugins: [
    'prettier-plugin-tailwindcss',
    '@ianvs/prettier-plugin-sort-imports'
  ],
  proseWrap: 'always'
}
