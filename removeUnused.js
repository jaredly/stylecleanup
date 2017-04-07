
module.exports = (lines, unused) => {
  const toRemove = {}
  unused.forEach(u => {
    for (let i=u.loc.start.line - 1; i<u.loc.end.line; i++) {
      toRemove[i] = true
    }
  })
  return lines.filter((_, i) => !toRemove[i])
}

