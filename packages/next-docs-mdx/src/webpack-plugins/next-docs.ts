import fs from 'fs'
import type { Compiler } from 'webpack'

let firstLoad = true

type Options = {
  rootMapFile: string
}

const content = `
declare const map: unknown

export { map }
`.trim()

export class NextDocsWebpackPlugin {
  options: Options

  constructor(options: Options) {
    this.options = options
  }

  apply(compiler: Compiler) {
    compiler.hooks.beforeCompile.tap(NextDocsWebpackPlugin.name, () => {
      if (firstLoad && !fs.existsSync(this.options.rootMapFile)) {
        fs.writeFileSync(this.options.rootMapFile, content)
        console.log('Created _map.ts file for you automatically')

        firstLoad = false
      }
    })
  }
}
