/* eslint-env node */

module.exports = function (code) {
  const callback = this.async()
  import('./dist/loader.mjs').then(mod =>
    mod.default.call(this, code, callback)
  )
}
