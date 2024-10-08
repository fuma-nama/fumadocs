module.exports = {
  extends: ['custom/library'],
  rules: {
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
  ignorePatterns: ['test/**/*.out.js'],
};
