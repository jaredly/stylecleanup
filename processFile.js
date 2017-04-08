
const fs = require('fs')
const analyzeFile = require('./analyzeFile')
const removeUnused = require('./removeUnused')
const chalk = require('chalk')

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

const showCode = (code, loc) => {
  if (code.indexOf('\n') !== -1) return console.log(code)
  console.log(code.slice(0, loc.start.column) + chalk.red(code.slice(loc.start.column, loc.end.column)) + code.slice(loc.end.column))
}

const showMissing = ({key, loc, code}) => {
  console.log(`Missing style '${key}' at ${pos(loc)}`)
  showCode(code, loc)
}

const showUnused = ({key, loc, code}) => {
  console.log(`Unused style declaration '${key}' at ${pos(loc)}`)
  showCode(code, loc)
}

const showSheet = ({warnings, missing, unused}) => {
  if (warnings.length) {
    console.log(chalk.bold.red('⚠️  Warnings ⚠️'))
    warnings.forEach(showWarning)
  }
  if (missing.length) {
    console.log(chalk.bold.red('🔍  Missing styles 🔍'))
    missing.forEach(showMissing)
  }
  if (unused.length) {
    console.log(chalk.bold.red('🤔  Unused styles 🤔'))
    unused.forEach(showUnused)
  }
}

const processFile = (file, cmd) => {
  const {sheets, lines} = analyzeFile(file)

  if (!sheets.length) {
    return {removed: 0, skipped: []}
  }

  if (cmd === 'check') {
    if (sheets.some(sheet => sheet.missing.length || sheet.unused.length)) {
      console.log(chalk.bold.blue('File: ' + file))
      sheets.forEach(showSheet)
    }
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

    console.log(chalk.bold.blue('File: ' + file))
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

module.exports = processFile

