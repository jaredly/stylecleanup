
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
  console.log('File: ', file)

  const {sheets, lines} = processFile(file)

  if (!sheets.length) {
    console.log("No stylesheets found")
    return 0
  }

  if (cmd === 'check') {
    sheets.forEach(showSheet)
    return 0
  } else {
    const toRemove = []

    sheets.forEach(sheet => {
      if (!sheet.unused.length) return
      if (sheet.warnings.length) {
        if (cmd === 'fix') {
          return console.log('Not removing unused styles - fix warnings or use `fix-force`')
        }
      }
      toRemove.push(...sheet.unused)
    })

    if (toRemove.length) {
      const fixed = removeUnused(lines, toRemove)
      fs.writeFileSync(file, fixed.join('\n'))
      console.log(`Removed ${toRemove.length} unused styles`)
    } else {
      console.log('Nothing to remove')
    }
    return toRemove.length
  }
}

const [_, __, cmd, file] = process.argv

const cmds = ['check', 'fix', 'fix-force']
if (!cmd || !file || cmd === 'help' || cmds.indexOf(cmd) === -1) {
  console.log("Usage: index.js [command] some/file/to/check.js")
  console.log("  command: one of 'check', 'fix', 'fix-force'")
  process.exit()
}

const files = glob.sync(file)

const add = (a, b) => a + b

const removed = files.map(file => run(file, cmd)).reduce(add)

if (cmd !== 'check') {
  console.log()
  console.log(`Removed ${removed} unused styles`)
}


