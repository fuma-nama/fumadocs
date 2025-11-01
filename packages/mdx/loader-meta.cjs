module.exports = function loader(code) {
  const callback = this.async();

  import('./dist/webpack/meta.js').then((mod) =>
    mod.default.call(this, code, callback),
  );
};
