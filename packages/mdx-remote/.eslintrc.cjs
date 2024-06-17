module.exports = {
  extends: ['custom/library'],
  rules: {
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
  },
  ignorePatterns: ['*.test.ts', '*.output.json5'],
};
