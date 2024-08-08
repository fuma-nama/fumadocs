module.exports = {
  extends: ['custom/next'],
  rules: {
    // commonjs compatibility
    'import/no-named-as-default-member': 'off',
    'no-console': 'off',
    // some arrays will not be changed
    'react/no-array-index-key': 'off',
  },
};
