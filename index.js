
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

let [_, __, cmd, file] = process.argv

const cmds = ['check', 'fix', 'fix-force']

if (process.argv.length === 2) {
  cmd = 'check'
  file = './**/*.js'
}

if (!cmd || !file || cmd === 'help' || cmds.indexOf(cmd) === -1) {
  console.log("Usage: index.js [command] some/file/to/check.js")
  console.log("  command: one of 'check', 'fix', 'fix-force'")
  process.exit()
}

const files = glob.sync(resolveHome(file))
  .filter(x => x.indexOf('/node_modules/') === -1)

console.log(`Checking ${files.length} files matching ${file}`)

const add = (a, b) => a + b
const append = (a, b) => [...a, ...b]

const results = files.map(file => processFile(file, cmd))
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

