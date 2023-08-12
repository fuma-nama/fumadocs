import fs from 'fs'
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

async function main() {
  intro(color.bgCyan(color.bold('Create Next Docs')))

  const name = await text({
    message: 'Project name',
    placeholder: 'my-app',
    defaultValue: 'my-app'
  })

  if (isCancel(name)) return cancel()

  const type = await select({
    message: 'Which example you want to install?',
    options: [
      { value: 'simple', label: 'Default' },
      { value: 'advanced', label: 'Advanced' }
    ]
  })

  if (isCancel(type)) return cancel()

  const cwd = process.cwd()
  const pathname = name.toLowerCase().replace(/\s/, '-')
  const dest = path.resolve(cwd, pathname)

  if (fs.existsSync(dest)) {
    const del = await confirm({
      message: `${pathname} already exists, do you want to delete it?`
    })

    if (isCancel(del)) return cancel()

    if (del) {
      const info = spinner()
      info.start(`Deleting ${pathname}`)

      fs.rmSync(dest, {
        recursive: true,
        force: true
      })

      info.stop(`Deleted ${pathname}`)
    } else {
      return cancel('Installation Stopped')
    }
  }

  const info = spinner()
  info.start('Copying files to ' + pathname)
  copy(path.resolve(__dirname, `../templates/${type}`), dest)

  info.message('Updating package.json')
  updatePackageJson(path.join(dest, 'package.json'), name)

  info.message('Updating README.md')
  generateReadme(path.join(dest, 'README.md'), name)

  info.stop('Project Generated')

  outro(color.bgGreen(color.bold('Done')))

  if (type === 'advanced') {
    console.log('✔ Tailwind CSS')
  }
  console.log('✔ Typescript')

  console.log(color.bold('\nOpen the project'))
  console.log(color.cyan(`cd ${pathname}`))

  console.log(color.bold('\nInstall Packages'))
  console.log(color.cyan('npm install | pnpm install | yarn install'))

  console.log(color.bold('\nRun Development Server'))
  console.log(color.cyan('npm run dev | pnpm run dev | yarn dev'))

  console.log(
    color.bold('\nYou can now open the project and start writing documents\n')
  )
}

main()

function updatePackageJson(path: string, projectName: string) {
  const packageJson = JSON.parse(fs.readFileSync(path).toString())

  packageJson.name = projectName

  fs.writeFileSync(path, JSON.stringify(packageJson, undefined, 2))
}

function generateReadme(path: string, projectName: string) {
  const content = `
  # ${projectName}

  This is a Next.js application generated with [Create Next Docs](https://github.com/SonMooSans/next-docs).

  Run development server:

  \`\`\`bash
  npm run dev
  # or
  pnpm dev
  # or
  yarn dev
  \`\`\`
  Open http://localhost:3000 with your browser to see the result.

  ## Learn More
  
  To learn more about Next.js and Next Docs, take a look at the following resources:
  
  - [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
  - [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
  - [Next Docs](https://next-docs-zeta.vercel.app) - learn about Next Docs
  `
    .split('\n')
    .map(s => s.trim())
    .join('\n')

  fs.writeFileSync(path, content)
}

function copy(
  from: string,
  to: string,
  rename: (s: string) => string = s => s
) {
  if (!fs.existsSync(from)) return

  const stats = fs.statSync(from)

  if (stats.isDirectory()) {
    fs.readdirSync(from).forEach(file => {
      copy(path.join(from, file), path.join(to, rename(file)))
    })
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }
}
