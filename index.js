
const processFile = require('./processFile')
const removeUnused = require('./removeUnused')
const fs = require('fs')
const glob = require('glob')

const pos = loc => `${loc.start.line}:${loc.start.column}`

const showWarning = warning => {
  switch (warning.type) {
    case 'reference':
      console.log(`> Non-standard reference to stylesheet variable at ${pos(warning.loc)}`)
      console.log(warning.code)
      break
    case 'computed':
      console.log(`> Computed access to stylesheet variable at ${pos(warning.loc)}`)
      console.log(warning.code)
      break
    default:
      throw new Error('Unexpected warning type: ' + warning.type)
  }
}

const showMissing = ({key, loc, code}) => {
  console.log(`Missing style '${key}'at ${pos(loc)}`)
  console.log(code)
}

const showUnused = ({key, loc, code}) => {
  console.log(`Unused style declaration '${key}' at ${pos(loc)}`)
  console.log(code)
}

const showSheet = ({warnings, missing, unused}) => {
  if (warnings.length) {
    console.log('⚠️ Warnings ⚠️')
    warnings.forEach(showWarning)
  }
  if (missing.length) {
    console.log('🔍 Missing styles 🔍')
    missing.forEach(showMissing)
  }
  if (unused.length) {
    console.log('🤔 Unused styles 🤔')
    unused.forEach(showUnused)
  }
}

const run = (file, cmd) => {
  const {sheets, lines} = processFile(file)

  if (!sheets.length) {
    return {removed: 0, skipped: []}
  }

  if (cmd === 'check') {
    console.log('File: ', file)
    sheets.forEach(showSheet)
    return {removed: 0, skipped: []}
  } else {
    const toRemove = []
    let skipped = 0

    sheets.forEach(sheet => {
      if (!sheet.unused.length) return
      if (sheet.warnings.length) {
        if (cmd === 'fix') {
          skipped += sheet.unused.length
          return
        }
      }
      toRemove.push(...sheet.unused)
    })

    if (skipped === 0 && !toRemove.length) {
      return {removed: 0, skipped: []}
    }

    console.log('File: ', file)
    if (skipped > 0) {
      console.log(`Not removing ${skipped} potentially unused styles - use 'check' to view warnings or use 'fix-force'`)
    }
    if (toRemove.length) {
      const fixed = removeUnused(lines, toRemove)
      fs.writeFileSync(file, fixed.join('\n'))
      console.log(`Removed ${toRemove.length} unused styles`)
    }
    return {removed: toRemove.length, skipped: skipped > 0 ? [{file, count: skipped}] : []}
  }
}

const [_, __, cmd, file] = process.argv

const cmds = ['check', 'fix', 'fix-force']
if (!cmd || !file || cmd === 'help' || cmds.indexOf(cmd) === -1) {
  console.log("Usage: index.js [command] some/file/to/check.js")
  console.log("  command: one of 'check', 'fix', 'fix-force'")
  process.exit()
}

const files = glob.sync(file).filter(x => x.indexOf('/node_modules/') === -1)
console.log(files.length)

const add = (a, b) => a + b
const append = (a, b) => [...a, ...b]

const results = files.map(file => run(file, cmd))
const removed = results.map(r => r.removed).reduce(add)

if (cmd !== 'check') {
  console.log()
  console.log(`Removed ${removed} unused styles`)
  const skipped = results.map(r => r.skipped).reduce(append)
  if (skipped.length) {
    const total = skipped.map(s => s.count).reduce(add)
    console.log(`Skipped ${total} potentially unused styles in the following ${skipped.length} files b/c of unusual stylesheet references. Run with the 'check' command for more info`)
    skipped.forEach(f => console.log(' -', f.count, f.file))
  }
}

