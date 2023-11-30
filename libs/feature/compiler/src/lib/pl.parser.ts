/* parser generated by jison 0.3.0 */
/**
 * Returns a Parser implementing JisonParserApi and a Lexer implementing JisonLexerApi.
 */

import { v4 as uuidv4 } from 'uuid'
import { Variables } from './pl.variables'

// VALUES

export type PLValueType =
  | 'PLArray'
  | 'PLObject'
  | 'PLString'
  | 'PLNumber'
  | 'PLBoolean'
  | 'PLComponent'
  | 'PLDict'
  | 'PLFileURL'
  | 'PLReference'
  | 'PLFileContent'

export interface PLValue {
  readonly type: PLValueType
  readonly value: string | number | boolean | PLValue[] | Record<string, PLValue>
  readonly lineno: number
  toRaw(): any
  toObject(visitor: PLVisitor): any | Promise<any>
}

export class PLArray implements PLValue {
  readonly type = 'PLArray'
  constructor(
    readonly value: PLValue[],
    readonly lineno: number
  ) {}

  toRaw() {
    return this.value.map((value) => value.toRaw())
  }

  async toObject(visitor: PLVisitor) {
    const result: any[] = []
    // do not use promise.all to allow cache file operations (@copyurl, @copycontent...)
    for (const e of this.value) {
      result.push(await e.toObject(visitor))
    }
    return result
  }
}

export class PLObject implements PLValue {
  readonly type = 'PLArray'
  constructor(
    readonly value: Record<string, PLValue>,
    readonly lineno: number
  ) {}

  toRaw() {
    return Object.keys(this.value).reduce((acc, curr) => {
      acc[curr] = this.value[curr].toRaw()
      return acc
    }, {} as any)
  }

  async toObject(visitor: PLVisitor) {
    // do not use promise.all to allow cache file operations (@copyurl, @copycontent...)
    let result: any = {}
    for (let key in this.value) {
      result[key] = await this.value[key].toObject(visitor)
    }
    return result
  }
}

export class PLString implements PLValue {
  readonly type = 'PLArray'
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  toRaw() {
    return this.value
  }
  toObject() {
    return this.value.trim()
  }
}

export class PLNumber implements PLValue {
  readonly type = 'PLNumber'
  constructor(
    readonly value: number,
    readonly lineno: number
  ) {}
  toRaw() {
    return this.value
  }
  toObject() {
    return this.value
  }
}

export class PLBoolean implements PLValue {
  readonly type = 'PLBoolean'
  constructor(
    readonly value: boolean,
    readonly lineno: number
  ) {}
  toRaw() {
    return this.value
  }
  toObject() {
    return this.value
  }
}

export class PLComponent implements PLValue {
  readonly type = 'PLComponent'
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  toRaw() {
    return { cid: uuidv4(), selector: this.value }
  }
  toObject() {
    return { cid: uuidv4(), selector: this.value }
  }
}

export class PLDict implements PLValue {
  readonly type = 'PLDict'
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  toRaw() {
    return `@extends ${this.value}`
  }
  async toObject(visitor: PLVisitor) {
    const source = await visitor.visitExtends(this, false)
    return source.variables
  }
}

export class PLFileURL implements PLValue {
  readonly type = 'PLFileURL'
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  toRaw() {
    return `@copyurl ${this.value}`
  }
  toObject(visitor: PLVisitor) {
    return visitor.visitCopyUrl(this)
  }
}

export class PLReference implements PLValue {
  readonly type = 'PLReference'
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  toRaw() {
    return this.value
  }
  toObject(visitor: PLVisitor) {
    return visitor.visitReference(this)
  }
}

export class PLFileContent implements PLValue {
  readonly type = 'PLFileContent'
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  toRaw() {
    return `@copycontent ${this.value}`
  }
  toObject(visitor: PLVisitor) {
    return visitor.visitCopyContent(this)
  }
}

// NODES

export type PLNodeType = 'ExtendsNode' | 'CommentNode' | 'IncludeNode' | 'AssignmentNode'

export interface PLNode {
  readonly type: PLNodeType
  origin: string
  accept(visitor: PLVisitor): Promise<void>
}

export class ExtendsNode implements PLNode {
  readonly type = 'ExtendsNode'
  origin = ''

  constructor(
    readonly path: string,
    readonly lineno: number
  ) {}

  async accept(visitor: PLVisitor): Promise<void> {
    await visitor.visitExtends(this, true)
  }
}

export class CommentNode implements PLNode {
  readonly type = 'CommentNode'
  origin = ''

  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}

  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitComment(this)
  }
}

export class IncludeNode implements PLNode {
  readonly type = 'IncludeNode'
  origin = ''
  constructor(
    readonly path: string,
    readonly lineno: number
  ) {}
  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitInclude(this)
  }
}

export class AssignmentNode implements PLNode {
  readonly type = 'AssignmentNode'
  origin = ''

  constructor(
    readonly key: string,
    readonly value: PLValue,
    readonly lineno: number
  ) {}

  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitAssignment(this)
  }
}

// AST

export type PLAst = PLNode[]

export interface PLDependency {
  alias?: string
  lineno: number
  content: string
  abspath: string
}

export interface PLSourceFile {
  /** Identifier of the compiler resource. */
  resource: string

  /** Version of the compiled resource. */
  version: string

  /**
   * Absolute path to the source file.
   */
  abspath: string

  /**
   * All variables defined in the source file including extended variables.
   */
  variables: Record<string, unknown>

  /** List of file added using the `@include` instruction. */
  dependencies: PLDependency[]
  ast: {
    nodes: PLAst
    /**
     * Variables explicitly defined in the main source file.
     */
    variables: Record<string, unknown>
  }

  /**
   * Errors detected while compiling the source file.
   */
  errors: {
    lineno: number
    abspath: string
    description: string
  }[]

  /**
   * Warnings detected while compiling the source file.
   */
  warnings: {
    lineno: number
    abspath: string
    description: string
  }[]
}

// VISITOR

export interface PLVisitor {
  visit(ast: PLAst): Promise<PLSourceFile>
  visitExtends(node: ExtendsNode | PLDict, merge: boolean): Promise<PLSourceFile>
  visitInclude(node: IncludeNode): Promise<void>
  visitComment(node: CommentNode): Promise<void>
  visitAssignment(node: AssignmentNode): Promise<void>
  visitCopyUrl(node: PLFileURL): Promise<string>
  visitReference(node: PLReference): Promise<any>
  visitCopyContent(node: PLFileContent): Promise<string>
}

import {
  JisonParser,
  JisonParserApi,
  StateType,
  SymbolsType,
  TerminalsType,
  ProductionsType,
  o,
} from '@ts-jison/parser'
const $V0 = [1, 8],
  $V1 = [1, 9],
  $V2 = [1, 11],
  $V3 = [1, 10],
  $V4 = [5, 8, 12, 19, 34],
  $V5 = [1, 24],
  $V6 = [1, 23],
  $V7 = [1, 25],
  $V8 = [1, 26],
  $V9 = [1, 27],
  $Va = [1, 28],
  $Vb = [1, 29],
  $Vc = [1, 30],
  $Vd = [1, 31],
  $Ve = [1, 32],
  $Vf = [1, 35],
  $Vg = [13, 31],
  $Vh = [5, 8, 12, 19, 26, 29, 32, 34],
  $Vi = [1, 48],
  $Vj = [26, 32],
  $Vk = [29, 32]

export class PLParser extends JisonParser implements JisonParserApi {
  $?: any

  constructor(yy = {}, lexer = new PLLexer(yy)) {
    super(yy, lexer)
  }

  symbols_: SymbolsType = {
    error: 2,
    program: 3,
    statements: 4,
    EOF: 5,
    statement: 6,
    comment: 7,
    COMMENT: 8,
    assignment_statement: 9,
    include_statement: 10,
    extends_statement: 11,
    IDENTIFIER: 12,
    EQUALS: 13,
    value_multi: 14,
    value: 15,
    NUMBER: 16,
    BOOLEAN: 17,
    STRING: 18,
    EXTENDS: 19,
    PATH: 20,
    COPYURL: 21,
    COPYCONTENT: 22,
    COLON: 23,
    SELECTOR: 24,
    LBRACKET: 25,
    RBRACKET: 26,
    elements: 27,
    LBRACE: 28,
    RBRACE: 29,
    pairs: 30,
    ANY: 31,
    COMMA: 32,
    pair: 33,
    INCLUDE: 34,
    $accept: 0,
    $end: 1,
  }
  terminals_: TerminalsType = {
    2: 'error',
    5: 'EOF',
    8: 'COMMENT',
    12: 'IDENTIFIER',
    13: 'EQUALS',
    16: 'NUMBER',
    17: 'BOOLEAN',
    18: 'STRING',
    19: 'EXTENDS',
    20: 'PATH',
    21: 'COPYURL',
    22: 'COPYCONTENT',
    23: 'COLON',
    24: 'SELECTOR',
    25: 'LBRACKET',
    26: 'RBRACKET',
    28: 'LBRACE',
    29: 'RBRACE',
    31: 'ANY',
    32: 'COMMA',
    34: 'INCLUDE',
  }
  productions_: ProductionsType = [
    0,
    [3, 2],
    [4, 1],
    [4, 1],
    [4, 2],
    [4, 2],
    [7, 1],
    [6, 1],
    [6, 1],
    [6, 1],
    [9, 4],
    [9, 3],
    [9, 4],
    [9, 3],
    [15, 2],
    [15, 1],
    [15, 1],
    [15, 1],
    [15, 1],
    [15, 2],
    [15, 2],
    [15, 2],
    [15, 2],
    [15, 2],
    [15, 3],
    [15, 2],
    [15, 3],
    [14, 2],
    [14, 1],
    [27, 1],
    [27, 3],
    [30, 1],
    [30, 3],
    [33, 3],
    [10, 2],
    [11, 2],
  ]
  table: Array<StateType> = [
    { 3: 1, 4: 2, 6: 3, 7: 4, 8: $V0, 9: 5, 10: 6, 11: 7, 12: $V1, 19: $V2, 34: $V3 },
    { 1: [3] },
    { 5: [1, 12], 6: 14, 7: 13, 8: $V0, 9: 5, 10: 6, 11: 7, 12: $V1, 19: $V2, 34: $V3 },
    o($V4, [2, 2]),
    o($V4, [2, 3]),
    o($V4, [2, 7]),
    o($V4, [2, 8]),
    o($V4, [2, 9]),
    o($V4, [2, 6]),
    { 13: [1, 15] },
    { 20: [1, 16] },
    { 20: [1, 17] },
    { 1: [2, 1] },
    o($V4, [2, 4]),
    o($V4, [2, 5]),
    {
      8: [1, 18],
      12: $V5,
      13: [1, 19],
      14: 20,
      15: 21,
      16: $V6,
      17: $V7,
      18: $V8,
      19: $V9,
      21: $Va,
      22: $Vb,
      23: $Vc,
      25: $Vd,
      28: $Ve,
      31: [1, 22],
    },
    o($V4, [2, 34]),
    o($V4, [2, 35]),
    {
      8: $Vf,
      12: $V5,
      13: [1, 33],
      15: 34,
      16: $V6,
      17: $V7,
      18: $V8,
      19: $V9,
      21: $Va,
      22: $Vb,
      23: $Vc,
      25: $Vd,
      28: $Ve,
    },
    o($V4, [2, 11]),
    { 13: [1, 36], 31: [1, 37] },
    o($V4, [2, 13]),
    o($Vg, [2, 28]),
    o($Vh, [2, 15]),
    o($Vh, [2, 16]),
    o($Vh, [2, 17]),
    o($Vh, [2, 18]),
    { 20: [1, 38] },
    { 20: [1, 39] },
    { 20: [1, 40] },
    { 24: [1, 41] },
    {
      8: $Vf,
      12: $V5,
      15: 44,
      16: $V6,
      17: $V7,
      18: $V8,
      19: $V9,
      21: $Va,
      22: $Vb,
      23: $Vc,
      25: $Vd,
      26: [1, 42],
      27: 43,
      28: $Ve,
    },
    { 12: $Vi, 29: [1, 45], 30: 46, 33: 47 },
    o($V4, [2, 10]),
    o($Vh, [2, 14]),
    { 8: $Vf, 12: $V5, 15: 34, 16: $V6, 17: $V7, 18: $V8, 19: $V9, 21: $Va, 22: $Vb, 23: $Vc, 25: $Vd, 28: $Ve },
    o($V4, [2, 12]),
    o($Vg, [2, 27]),
    o($Vh, [2, 19]),
    o($Vh, [2, 20]),
    o($Vh, [2, 21]),
    o($Vh, [2, 22]),
    o($Vh, [2, 23]),
    { 26: [1, 49], 32: [1, 50] },
    o($Vj, [2, 29]),
    o($Vh, [2, 25]),
    { 29: [1, 51], 32: [1, 52] },
    o($Vk, [2, 31]),
    { 23: [1, 53] },
    o($Vh, [2, 24]),
    { 8: $Vf, 12: $V5, 15: 54, 16: $V6, 17: $V7, 18: $V8, 19: $V9, 21: $Va, 22: $Vb, 23: $Vc, 25: $Vd, 28: $Ve },
    o($Vh, [2, 26]),
    { 12: $Vi, 33: 55 },
    { 8: $Vf, 12: $V5, 15: 56, 16: $V6, 17: $V7, 18: $V8, 19: $V9, 21: $Va, 22: $Vb, 23: $Vc, 25: $Vd, 28: $Ve },
    o($Vj, [2, 30]),
    o($Vk, [2, 32]),
    o($Vk, [2, 33]),
  ]
  defaultActions: { [key: number]: any } = { 12: [2, 1] }

  performAction(
    yytext: string,
    yyleng: number,
    yylineno: number,
    yy: any,
    yystate: number /* action[1] */,
    $$: any /* vstack */,
    _$: any /* lstack */
  ): any {
    /* this == yyval */
    var $0 = $$.length - 1
    switch (yystate) {
      case 1:
        return $$[$0 - 1]
        break
      case 2:
      case 29:
        this.$ = [$$[$0]]
        break
      case 3:
        this.$ = [$$[$0]]
        break
      case 4:
        this.$ = $$[$0 - 1].concat($$[$0])
        break
      case 5:
        this.$ = $$[$0 - 1].concat($$[$0])
        break
      case 6:
        this.$ = new CommentNode($$[$0], yylineno + 1)
        break
      case 7:
      case 8:
      case 9:
      case 14:
      case 31:
        this.$ = $$[$0]
        break
      case 10:
        this.$ = new AssignmentNode($$[$0 - 3], new PLString('', yylineno + 1), yylineno + 1)
        break
      case 11:
        this.$ = new AssignmentNode($$[$0 - 2], new PLString('', yylineno + 1), yylineno + 1)
        break
      case 12:
        this.$ = new AssignmentNode($$[$0 - 3], new PLString($$[$0 - 1], yylineno + 1), yylineno + 1)
        break
      case 13:
        this.$ = new AssignmentNode($$[$0 - 2], $$[$0], yylineno + 1)
        break
      case 15:
        this.$ = new PLNumber(Number($$[$0].replace(/_/g, '')), yylineno + 1)
        break
      case 16:
        this.$ = new PLReference($$[$0], yylineno + 1)
        break
      case 17:
        this.$ = new PLBoolean($$[$0].toLowerCase() === 'true', yylineno + 1)
        break
      case 18:
        this.$ = new PLString($$[$0].slice(1, -1), yylineno + 1)
        break
      case 19:
        this.$ = new PLDict($$[$0], yylineno + 1)
        break
      case 20:
        this.$ = new PLFileURL($$[$0].trim(), yylineno + 1)
        break
      case 21:
        this.$ = new PLFileContent($$[$0], yylineno + 1)
        break
      case 22:
        this.$ = new PLComponent($$[$0], yylineno + 1)
        break
      case 23:
        this.$ = new PLArray([], yylineno + 1)
        break
      case 24:
        this.$ = new PLArray($$[$0 - 1], yylineno + 1)
        break
      case 25:
        this.$ = new PLObject({}, yylineno + 1)
        break
      case 26:
        this.$ = new PLObject($$[$0 - 1], yylineno + 1)
        break
      case 27:
        this.$ = $$[$0 - 1] + $$[$0]

        break
      case 28:
        if ($$[$0].trim().startsWith('#!lang=')) {
          this.$ = ''
        } else {
          this.$ = $$[$0]
        }

        break
      case 30:
        this.$ = $$[$0 - 2].concat($$[$0])
        break
      case 32:
        const keys = Object.keys($$[$0])
        $$[$0 - 2][keys[0]] = $$[$0][keys[0]]
        this.$ = $$[$0 - 2]

        break
      case 33:
        this.$ = { [`${$$[$0 - 2]}`]: $$[$0] }
        break
      case 34:
        this.$ = new IncludeNode($$[$0].trim(), yylineno + 1)
        break
      case 35:
        this.$ = new ExtendsNode($$[$0].trim(), yylineno + 1)
        break
    }
  }
}

/* generated by ts-jison-lex 0.3.0 */
import { JisonLexer, JisonLexerApi } from '@ts-jison/lexer'
export class PLLexer extends JisonLexer implements JisonLexerApi {
  options: any = { moduleName: 'PL' }
  constructor(yy = {}) {
    super(yy)
  }

  rules: RegExp[] = [
    /^(?:\s+)/,
    /^(?:#.*)/,
    /^(?:\/\/.*)/,
    /^(?:\/\*([^*]|\*[^\/])*\*\/)/,
    /^(?:==)/,
    /^(?:=)/,
    /^(?:@copycontent\b)/,
    /^(?:@copyurl\b)/,
    /^(?:@include\b)/,
    /^(?:@extends\b)/,
    /^(?:[+-]?\d+((_|\.)+\d+)*)/,
    /^(?:[,])/,
    /^(?:[:])/,
    /^(?:[\{])/,
    /^(?:[\}])/,
    /^(?:[\[])/,
    /^(?:[\]])/,
    /^(?:true|false|True|False\b)/,
    /^(?:wc-[a-zA-Z0-9_-]+)/,
    /^(?:[a-zA-Z_](\.?[a-zA-Z0-9_])*)/,
    /^(?:"([^\\\"]|\\.)*")/,
    /^(?:$)/,
    /^(?:[^\n]*\n)/,
    /^(?:\s+)/,
    /^(?:(\/?[a-zA-Z0-9_\+\.\\]+(\s+as\s+\/?[a-zA-Z0-9_\+\.])?)+)/,
  ]
  conditions: any = {
    MULTI_STATE: { rules: [21, 22], inclusive: true },
    PATH_STATE: { rules: [21, 23, 24], inclusive: true },
    INITIAL: { rules: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], inclusive: true },
  }
  performAction(yy: any, yy_: any, $avoiding_name_collisions: any, YY_START: any): any {
    var YYSTATE = YY_START
    switch ($avoiding_name_collisions) {
      case 0 /* ignore whitespace */:
        break
      case 1:
        return 8
        break
      case 2:
        return 8
        break
      case 3:
        return 8
        break
      case 4:
        this.begin('MULTI_STATE')
        return 13
        break
      case 5:
        return 13
        break
      case 6:
        this.begin('PATH_STATE')
        return 22
        break
      case 7:
        this.begin('PATH_STATE')
        return 21
        break
      case 8:
        this.begin('PATH_STATE')
        return 34
        break
      case 9:
        this.begin('PATH_STATE')
        return 19
        break
      case 10:
        return 16
        break
      case 11:
        return 32
        break
      case 12:
        return 23
        break
      case 13:
        return 28
        break
      case 14:
        return 29
        break
      case 15:
        return 25
        break
      case 16:
        return 26
        break
      case 17:
        return 17
        break
      case 18:
        return 24
        break
      case 19:
        return 12
        break
      case 20:
        return 18
        break
      case 21:
        return 5
        break
      case 22:
        if (yy_.yytext.trim() === '==') {
          this.popState()
          return 13
        }
        return 31

        break
      case 23 /* ignore whitespace */:
        break
      case 24:
        this.popState()
        return 20

        break
    }
  }
}
