module.exports = {
  extends: ['custom/library'],
  ignorePatterns: ['*.test.ts'],
  rules: {
    // typescript is CommonJS
    'import/no-named-as-default-member': 'off',
  },
};
