#!/usr/bin/env node

const glob = require('glob')
const path = require('path')
const os = require('os')

const processFile = require('./processFile')

function resolveHome(filepath) {
    if (filepath[0] === '~') {
        return path.join(os.homedir(), filepath.slice(1))
    }
    return filepath
}

let [_, __, cmd, ...files] = process.argv

const cmds = ['check', 'fix', 'fix-force']

if (process.argv.length === 2) {
  cmd = 'check'
  files = ['./**/*.js']
}

if (!cmd || !files.length || cmd === 'help' || cmds.indexOf(cmd) === -1) {
  console.log("Usage: stylecleanup [command] some/file/to/check.js")
  console.log("  command: one of 'check', 'fix', 'fix-force'")
  console.log("  globs are also supported, e.g.")
  console.log()
  console.log("  stylecleanup check './src/**/*.js'")
  process.exit()
}

const add = (a, b) => a + b
const append = (a, b) => [...a, ...b]

const allfiles = files.map(
  file => glob.sync(resolveHome(file))
    .filter(x => x.indexOf('/node_modules/') === -1)
).reduce(append, [])

console.log(`Checking ${allfiles.length} files matching ${files.join(' ')}`)

const results = allfiles.map(file => processFile(file, cmd))
const removed = results.map(r => r.removed).reduce(add, 0)

if (cmd !== 'check') {
  console.log()
  console.log(`Removed ${removed} unused styles`)
  const skipped = results.map(r => r.skipped).reduce(append, [])
  if (skipped.length) {
    const total = skipped.map(s => s.count).reduce(add)
    console.log(`Skipped ${total} potentially unused styles in the following ${skipped.length} files b/c of unusual stylesheet references. Run with the 'check' command for more info`)
    skipped.forEach(f => console.log(' -', f.count, f.file))
  }
}

