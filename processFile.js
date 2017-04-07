const babylon = require('babylon')
const traverse = require('babel-traverse').default


const fs = require('fs')

const isStyleSheetCreate = path => {
  // TODO could potentially check that this was imported from aphrodite, but
  // maybe no need?
  return path.node.callee.type === 'MemberExpression' &&
    path.node.callee.object.type === 'Identifier' &&
    path.node.callee.object.name === 'StyleSheet' &&
    path.parent.type === 'VariableDeclarator' &&
    path.node.arguments.length === 1 &&
    path.node.arguments[0].type === 'ObjectExpression'
}

const isStylesDotSomething = node => {
  return node.object.type === 'Identifier' &&
    node.object.name === 'styles' &&
    !node.computed &&
    node.property.type === 'Identifier'
}

const getName = idOrLiteral => {
  return idOrLiteral.type === 'Identifier'
    ? idOrLiteral.name
    : idOrLiteral.value
}

const locLines = (lines, loc) => lines.slice(loc.start.line - 1, loc.end.line).join('\n')

module.exports = (file) => {
  const text = fs.readFileSync(file, 'utf8')
  const ast = babylon.parse(text, {
    sourceType: 'module',
    plugins: ['jsx', 'flow', 'objectRestSpread', 'classProperties'],
  })
  const lines = text.split('\n')

  const styleSheets = []
  traverse(ast, {
    CallExpression(path) {
      if (isStyleSheetCreate(path)) {
        const members = path.node.arguments[0].properties.filter(
          property => property.type === 'ObjectProperty' // Not gonna try to figure out spreads
        )
        const keys = {}
        members.forEach(m => keys[getName(m.key)] = m)
        const keyNames = members.map(item => getName(item.key))
        styleSheets.push({id: path.parent.id, keys, keyNames, binding: path.scope.getBinding(path.parent.id.name)})
      }
    },
  })

  const sheets = styleSheets.map(({id, keys, keyNames, binding}) => {
    const warnings = []
    const referenced = binding.referencePaths.map(ref => {
      if (ref.parent.type !== 'MemberExpression') {
        warnings.push({
          type: 'reference',
          loc: ref.node.loc,
          code: locLines(lines, ref.parent.loc),
        })
        return
      }
      if (ref.parent.computed) {
        warnings.push({
          type: 'computed',
          loc: ref.node.loc,
          code: locLines(lines, ref.parent.loc),
        })
        return
      }
      return ref.parent
    }).filter(x => x)
    const refNames = referenced.map(ref => ref.property.name)

    const unused = keyNames.filter(k => refNames.indexOf(k) === -1).map(k => ({
      key: k,
      loc: keys[k].loc,
      code: locLines(lines, keys[k].loc),
    }))
    const missing = referenced.filter(r => keyNames.indexOf(r.property.name) === -1).map(r => ({
      key: r.property.name,
      loc: r.loc,
      code: locLines(lines, r.loc),
    }))

    return {loc: id.loc, code: locLines(lines, id.loc), warnings, unused, missing}
  })
  return {sheets, lines}
}


