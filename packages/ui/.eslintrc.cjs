module.exports = {
  extends: ['custom/next'],
  rules: {
    // for the import hacks
    '@typescript-eslint/consistent-type-imports': 'off',
    // some arrays like link items won't be changed
    'react/no-array-index-key': 'off',
  },
};
