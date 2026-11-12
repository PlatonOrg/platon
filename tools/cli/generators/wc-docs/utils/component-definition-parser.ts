/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Represents a component definition extracted from a TypeScript file
 */
export interface ExtractedComponentDefinition {
  name: string
  selector: string
  description: string
  playgrounds?: Record<string, string>
  schema: Record<string, any>
}

/**
 * Parses a TypeScript file to extract web component definitions
 */
export class ComponentDefinitionParser {
  /**
   * Extracts component definition from a TypeScript file
   * @param filePath Path to the TypeScript file containing the component definition
   * @returns The extracted component definition or null if none found
   */
  static extractComponentDefinition(filePath: string): ExtractedComponentDefinition | null {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const sourceFile = ts.createSourceFile(path.basename(filePath), fileContent, ts.ScriptTarget.Latest, true)
    const constants = collectConstants(filePath, sourceFile)

    let componentDefinition: ExtractedComponentDefinition | null = null

    // Traverse the AST to find the defineWebComponent call
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'defineWebComponent' &&
        node.arguments.length > 0
      ) {
        // Found the defineWebComponent call, extract the object literal
        const arg = node.arguments[0]
        if (ts.isObjectLiteralExpression(arg)) {
          componentDefinition = extractDefinitionFromObjectLiteral(arg, constants)
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return componentDefinition
  }
}

/**
 * Object literals declared as top-level constants, indexed by their name.
 * They are used to resolve the spread assignments (`...SharedProperties`) found in a component definition.
 */
type Constants = Map<string, ts.ObjectLiteralExpression>

/**
 * Collects the top-level object literal constants of a file and of the files it imports with a relative path.
 * @param filePath Path to the TypeScript file
 * @param sourceFile Parsed source of the file
 * @param visited Files already visited (prevents infinite loops on cyclic imports)
 * @returns The constants that can be referenced from the file
 */
function collectConstants(filePath: string, sourceFile: ts.SourceFile, visited = new Set<string>()): Constants {
  const constants: Constants = new Map()
  visited.add(path.resolve(filePath))

  sourceFile.statements.forEach((statement) => {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text
      if (!specifier.startsWith('.')) return

      const base = path.resolve(path.dirname(filePath), specifier)
      const importedPath = [`${base}.ts`, path.join(base, 'index.ts')].find((candidate) => fs.existsSync(candidate))
      if (!importedPath || visited.has(importedPath)) return

      const importedSource = ts.createSourceFile(
        path.basename(importedPath),
        fs.readFileSync(importedPath, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      )
      collectConstants(importedPath, importedSource, visited).forEach((value, name) => {
        if (!constants.has(name)) constants.set(name, value)
      })
    }
  })

  // Constants declared in the file itself have priority over the imported ones.
  sourceFile.statements.forEach((statement) => {
    if (!ts.isVariableStatement(statement)) return
    statement.declarationList.declarations.forEach((declaration) => {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        constants.set(declaration.name.text, declaration.initializer)
      }
    })
  })

  return constants
}

/**
 * Extract component definition properties from an object literal expression
 * @param objLiteral The object literal from the AST
 * @param constants Constants that can be referenced by spread assignments
 * @returns Extracted component definition
 */
function extractDefinitionFromObjectLiteral(
  objLiteral: ts.ObjectLiteralExpression,
  constants: Constants
): ExtractedComponentDefinition {
  const result: Partial<ExtractedComponentDefinition> = {}

  objLiteral.properties.forEach((prop) => {
    if (!ts.isPropertyAssignment(prop)) return

    const propName = prop.name.getText()
    switch (propName) {
      case 'name':
        result.name = extractObjectLiteralValue(prop.initializer, constants)
        break
      case 'selector':
        result.selector = extractObjectLiteralValue(prop.initializer, constants)
        break
      case 'description':
        result.description = extractObjectLiteralValue(prop.initializer, constants)
        break
      case 'schema':
        result.schema = extractObjectLiteralValue(prop.initializer, constants)
        break
      case 'playgrounds':
        result.playgrounds = extractObjectLiteralValue(prop.initializer, constants)
        break
    }
  })

  return result as ExtractedComponentDefinition
}

/**
 * Extracts the value from a TypeScript node as a JavaScript object
 * @param node The TypeScript AST node
 * @param constants Constants that can be referenced by spread assignments
 * @returns The JavaScript object representation
 */
function extractObjectLiteralValue(node: ts.Node, constants: Constants = new Map()): any {
  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, any> = {}
    node.properties.forEach((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        const propName =
          ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name)
            ? prop.name.text
            : prop.name.getText().replace(/['"`]/g, '')
        obj[propName] = extractObjectLiteralValue(prop.initializer, constants)
      } else if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression)) {
        // `...SharedProperties`: merge the properties of the referenced constant
        const constant = constants.get(prop.expression.text)
        if (constant) {
          Object.assign(obj, extractObjectLiteralValue(constant, constants))
        }
      }
    })
    return obj
  } else if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => extractObjectLiteralValue(element, constants))
  } else if (ts.isStringLiteral(node)) {
    return node.text.replace(/[`]/g, '')
  } else if (ts.isNumericLiteral(node)) {
    return Number(node.text)
  } else if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text)
  } else if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
    return node.kind === ts.SyntaxKind.TrueKeyword
  } else {
    // For other types, return the text representation
    return node.getText().replace(/[`]/g, '')
  }
}
