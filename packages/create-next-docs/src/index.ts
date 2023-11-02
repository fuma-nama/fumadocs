#!/usr/bin/env node
import { existsSync } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text
} from '@clack/prompts'
import * as color from 'picocolors'
import { autoInstall, getPackageManager } from './auto-install'

async function main() {
  const cwd = process.cwd()
  const sourceDir = path.resolve(__dirname, '../')
  intro(color.bgCyan(color.bold('Create Next Docs')))

  const inputName = await text({
    message: 'Project name',
    placeholder: 'my-app',
    defaultValue: 'my-app'
  })

  if (isCancel(inputName)) return cancel()

  const pathname = inputName.toLowerCase().replace(/\s/, '-')
  const dest = path.resolve(cwd, pathname)
  const name = path.basename(dest)

  const type = await select({
    message: 'Which example you want to install?',
    options: [
      { value: 'simple', label: 'Default (Contentlayer)' },
      { value: 'advanced', label: 'Advanced (Contentlayer)' },
      { value: 'simple-mdx', label: 'Default (Next Docs MDX)' }
    ]
  })

  if (isCancel(type)) return cancel()

  if (existsSync(dest)) {
    const del = await confirm({
      message: `${pathname} already exists, do you want to delete it?`
    })

    if (isCancel(del)) return cancel()

    if (del) {
      const info = spinner()
      info.start(`Deleting ${pathname}`)

      await fs.rm(dest, {
        recursive: true,
        force: true
      })

      info.stop(`Deleted ${pathname}`)
    }
  }

  const info = spinner()
  info.start(`Copying files to ${pathname}`)

  await copy(path.join(sourceDir, `templates/${type}`), dest)
  await copy(
    path.join(sourceDir, 'static/content'),
    path.join(dest, 'content/docs')
  )

  info.message('Updating package.json')
  await updatePackageJson(path.join(dest, 'package.json'), name)

  info.message('Updating README.md')
  await generateReadme(
    path.join(sourceDir, 'static/README.md'),
    path.join(dest, 'README.md'),
    name
  )

  info.message('Adding .gitignore')
  await fs.copyFile(
    path.join(sourceDir, 'static/example.gitignore'),
    path.join(dest, '.gitignore')
  )

  info.stop('Project Generated')

  const manager = getPackageManager()
  const shouldInstall = await confirm({
    message: `Do you want to install packages automatically? (detected as ${manager})`
  })

  if (isCancel(shouldInstall)) cancel()

  if (shouldInstall) {
    await autoInstall(manager, dest)
  }

  outro(color.bgGreen(color.bold('Done')))

  if (type === 'advanced') {
    console.log('✔ Tailwind CSS')
  }
  console.log('✔ Typescript')

  console.log(color.bold('\nOpen the project'))
  console.log(color.cyan(`cd ${pathname}`))

  console.log(color.bold('\nRun Development Server'))
  console.log(color.cyan('npm run dev | pnpm run dev | yarn dev'))

  console.log(
    color.bold('\nYou can now open the project and start writing documents')
  )

  process.exit(0)
}

async function updatePackageJson(path: string, projectName: string) {
  const packageJson = JSON.parse((await fs.readFile(path)).toString())

  packageJson.name = projectName

  await fs.writeFile(path, JSON.stringify(packageJson, undefined, 2))
}

async function generateReadme(
  templatePath: string,
  destination: string,
  projectName: string
) {
  const template = await fs.readFile(templatePath).then(res => res.toString())
  const content = `# ${projectName}\n\n${template}`

  await fs.writeFile(destination, content)
}

async function copy(
  from: string,
  to: string,
  rename: (s: string) => string = s => s
) {
  const stats = await fs.stat(from)

  if (stats.isDirectory()) {
    const files = await fs.readdir(from)

    await Promise.all(
      files.map(file =>
        copy(path.join(from, file), path.join(to, rename(file)))
      )
    )
  } else {
    await fs.mkdir(path.dirname(to), { recursive: true })
    await fs.copyFile(from, to)
  }
}

main().catch(e => {
  console.error(e)
  throw e
})
