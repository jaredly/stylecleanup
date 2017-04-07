
const processFile = require('./processFile')

const [_, __, file] = process.argv


if (!file) {
  console.log("Usage: index.js some/file/to/check.js")
  process.exit()
}

// const file = '/Users/jared/khan/webapp/javascript/content-library-package/components/practice-content-carousel.jsx'

const sheets = processFile(file)

console.log('File: ', file)
sheets.forEach(({warnings, missing, unused}) => {
  console.log('Warnings:')
  warnings.forEach(warn => console.log(warn))
  console.log('Missing:')
  missing.forEach(m => {
    console.log('  ', m.key, m.loc.start)
    // console.log(m)
  })
  console.log('Unused:')
  unused.forEach(u => {
    console.log('  ', u.key, u.loc.start)
    // console.log(u)
  })
})

if (!sheets.length) {
  console.log("No stylesheets found")
}
