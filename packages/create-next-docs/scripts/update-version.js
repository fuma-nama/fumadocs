/* eslint-disable */
/* Automatically update version after releasing other packages */

const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const packageJson = path.resolve(process.cwd(), 'package.json')
const file = JSON.parse(readFileSync(packageJson).toString())

console.log('Update version:', file.version)

if ('version' in file) {
  const segments = file.version.split('.')
  segments[segments.length - 1]++
  file.version = segments.join('.')
  console.log('New:', file.version)

  writeFileSync(packageJson, JSON.stringify(file, undefined, 2))
}
