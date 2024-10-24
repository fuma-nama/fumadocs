/* eslint-env node -- Node.js env */

module.exports = function loader(code) {
  const callback = this.async();

  import('./dist/loader-mdx.js').then((mod) =>
    mod.default.call(this, code, callback),
  );
};
