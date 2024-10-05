module.exports = {
  extends: ['custom/library'],
  rules: {
    'import/no-relative-packages': 'off',
  },
  ignorePatterns: ['test/repo', 'test/repo-2'],
};
