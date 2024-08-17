module.exports = {
  extends: ['custom/next'],
  ignorePatterns: ['*.test.ts', '*.output.js'],
  rules: {
    'no-console': 'off',
    // handled by bundler
    'import/no-cycle': 'off'
  },
};
