import path from 'path'
import fg from 'fast-glob'
import type { LoaderContext } from 'webpack'

export type LoaderOptions = {
  rootContentPath: string
  cwd: string
}

/**
 * Load the root `_map.ts` file
 */
export default function loader(
  this: LoaderContext<LoaderOptions>,
  _source: string,
  callback: (err?: null | Error, content?: string | Buffer) => void
) {
  const { cwd, rootContentPath } = this.getOptions()

  this.cacheable(true)
  this.addContextDependency(path.resolve(cwd, rootContentPath))

  callback(null, buildMap({ cwd, rootContentPath }))
}

function buildMap({ cwd, rootContentPath }: LoaderOptions): string {
  const files = fg.sync('./**/*.{md,mdx,json}', {
    cwd: path.resolve(cwd, rootContentPath)
  })

  const entries = files.map(file => {
    const importPath = path.join(rootContentPath, file)

    return `${JSON.stringify(file)}: await import(${JSON.stringify(
      importPath
    )})`
  })

  return `
export const map = {
    ${entries.join(',')}
}`
}
