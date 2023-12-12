/* eslint-env node -- Node.js env */

module.exports = function loader(code) {
  const callback = this.async();
  import('./dist/loader.mjs').then((mod) =>
    mod.default.call(this, code, callback),
  );
};
