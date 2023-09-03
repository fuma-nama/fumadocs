/* eslint-disable */
const fs = require('fs')
const { globSync } = require('fast-glob')
const path = require('path')
const pc = require('picocolors')

const sources = ['simple', 'advanced']

const cwd = process.cwd()

for (const source of sources) {
  console.log(pc.bgBlue(`Copying ${source}`))
  console.log(pc.bgRed('Deleting old files'))

  fs.rmSync(`./templates/${source}`, { recursive: true, force: true })

  const sourceDir = path.resolve(cwd, `../../examples/${source}`)
  const sourceFiles = globSync(
    [
      '**/*',
      '!node_modules',
      '!pnpm-lock.yaml',
      '!next-env.d.ts',
      '!.turbo',
      '!.next',
      '!.contentlayer'
    ],
    { dot: true, cwd: sourceDir }
  )

  Promise.all(
    sourceFiles.map(async p => {
      const dirname = path.dirname(p)
      const basename = path.basename(p)

      const from = path.resolve(sourceDir, p)
      const to = path.join(
        path.resolve(cwd, `./templates/${source}`),
        dirname,
        basename
      )

      console.log(p)
      // Ensure the destination directory exists
      await fs.promises.mkdir(path.dirname(to), { recursive: true })

      return fs.promises.copyFile(from, to)
    })
  )
}
