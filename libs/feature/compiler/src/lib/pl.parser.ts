/* parser generated by jison 0.3.0 */
/**
 * Returns a Parser implementing JisonParserApi and a Lexer implementing JisonLexerApi.
 */


import { v4 as uuidv4 } from 'uuid'

// VALUES

interface PLValue {
  readonly value: string | number | boolean | PLValue[] | {key: string, value: PLValue}[];
  readonly lineno: number;
  toJSON(visitor: PLVisitor): any | Promise<any>;
}

export class PLArray implements PLValue {
  constructor(
    readonly value: PLValue[],
    readonly lineno: number,
  ) {}
  async toJSON(visitor: PLVisitor) {
    const result: any[] = [];
    // do not use promise.all to allow cache file operations (@copyurl, @copycontent...)
    for (const e of this.value) {
      result.push(await e.toJSON(visitor));
    }
    return result;
  }
}

export class PLObject implements PLValue {
  constructor(
    readonly value: {key: string, value: PLValue}[],
    readonly lineno: number,
  ) {}
  async toJSON(visitor: PLVisitor) {
    // do not use promise.all to allow cache file operations (@copyurl, @copycontent...)
    for (let i = 0; i < this.value.length; i++) {
      this.value[i].value = await this.value[i].value.toJSON(visitor);
    }
    return this.value.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as any);
  }
}

export class PLString implements PLValue {
  constructor(
    readonly value: string,
    readonly lineno: number,
  ) {}

  toJSON() { return this.value.trim(); }
}

export class PLNumber implements PLValue {
  constructor(
    readonly value: number,
    readonly lineno: number,
  ) {}
  toJSON() { return this.value; }
}

export class PLBoolean implements PLValue {
  constructor(
    readonly value: boolean,
    readonly lineno: number,
  ) {}
  toJSON() { return this.value; }
}

export class PLComponent implements PLValue {
  constructor(
    readonly value: string,
    readonly lineno: number,
  ) {}
  toJSON() { return { 'cid': uuidv4(), selector: this.value }; }
}

export class PLDict implements PLValue {
  constructor(
    readonly value: string,
    readonly lineno: number,
  ) {}
  toJSON() { return { '__pldict': this.value }; }
}

export class PLFileURL implements PLValue {
  constructor(
    readonly value: string,
    readonly lineno: number,
  ) {}
  toJSON(visitor: PLVisitor) { return visitor.visitCopyUrl(this); }
}

export class PLReference implements PLValue {
  constructor(
    readonly value: string,
    readonly lineno: number,
  ) {}
  toJSON(visitor: PLVisitor) { return visitor.visitReference(this); }
}

export class PLFileContent implements PLValue {
  constructor(
    readonly value: string,
    readonly lineno: number,
  ) {}
  toJSON(visitor: PLVisitor) { return visitor.visitCopyContent(this); }
}

// NODES

export interface PLNode {
  accept(visitor: PLVisitor): Promise<void>;
}

export class ExtendsNode implements PLNode {
  constructor(
    readonly path: string,
    readonly lineno: number
  ) {}
  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitExtends(this);
  }
}

export class CommentNode implements PLNode {
  constructor(
    readonly value: string,
    readonly lineno: number
  ) {}
  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitComment(this);
  }
}

export class IncludeNode implements PLNode {
  constructor(
    readonly path: string,
    readonly alias: string,
    readonly lineno: number,
  ) {}
  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitInclude(this);
  }
}

export class AssignmentNode implements PLNode {
  constructor(
    readonly key: string,
    readonly value: PLValue,
    readonly lineno: number
  ) {}
  accept(visitor: PLVisitor): Promise<void> {
    return visitor.visitAssignment(this);
  }
}


// AST


export interface PLDependency {
  alias?: string;
  lineno: number;
  content: string;
  abspath: string;
}

export interface PLSourceFile {
  resource: string;
  version: string;
  abspath: string;
  errors: {
    lineno: number,
    abspath: string
    description: string
  }[];
  warnings: {
    lineno: number,
    abspath: string
    description: string
  }[];
  variables: Record<string, unknown>;
  dependencies: PLDependency[];
}

// VISITOR

export interface PLVisitor {
  visit(nodes: PLNode[]): Promise<PLSourceFile>;
  visitExtends(node: ExtendsNode): Promise<void>;
  visitInclude(node: IncludeNode): Promise<void>;
  visitComment(node: CommentNode): Promise<void>;
  visitAssignment(node: AssignmentNode): Promise<void>;
  visitCopyUrl(node: PLFileURL): Promise<string>;
  visitReference(node: PLReference): Promise<any>;
  visitCopyContent(node: PLFileContent): Promise<string>;
}



import { JisonParser, JisonParserApi, StateType, SymbolsType, TerminalsType, ProductionsType, o } from '@ts-jison/parser';const $V0=[1,8],$V1=[1,9],$V2=[1,11],$V3=[1,10],$V4=[5,8,12,19,34],$V5=[1,23],$V6=[1,22],$V7=[1,24],$V8=[1,25],$V9=[1,26],$Va=[1,27],$Vb=[1,28],$Vc=[1,29],$Vd=[1,30],$Ve=[1,31],$Vf=[13,31],$Vg=[5,8,12,19,26,29,32,34],$Vh=[1,45],$Vi=[26,32],$Vj=[29,32];

export class PLParser extends JisonParser implements JisonParserApi {
    $?: any;

    constructor (yy = {}, lexer = new PLLexer(yy)) {
      super(yy, lexer);
    }

    symbols_: SymbolsType = {"error":2,"program":3,"statements":4,"EOF":5,"statement":6,"comment":7,"COMMENT":8,"assignment_statement":9,"include_statement":10,"extends_statement":11,"IDENTIFIER":12,"EQUALS":13,"value_multi":14,"value":15,"NUMBER":16,"BOOLEAN":17,"STRING":18,"EXTENDS":19,"PATH":20,"COPYURL":21,"COPYCONTENT":22,"COLON":23,"SELECTOR":24,"LBRACKET":25,"RBRACKET":26,"elements":27,"LBRACE":28,"RBRACE":29,"pairs":30,"ANY":31,"COMMA":32,"pair":33,"INCLUDE":34,"AS":35,"$accept":0,"$end":1};
    terminals_: TerminalsType = {2:"error",5:"EOF",8:"COMMENT",12:"IDENTIFIER",13:"EQUALS",16:"NUMBER",17:"BOOLEAN",18:"STRING",19:"EXTENDS",20:"PATH",21:"COPYURL",22:"COPYCONTENT",23:"COLON",24:"SELECTOR",25:"LBRACKET",26:"RBRACKET",28:"LBRACE",29:"RBRACE",31:"ANY",32:"COMMA",34:"INCLUDE",35:"AS"};
    productions_: ProductionsType = [0,[3,2],[4,1],[4,1],[4,2],[4,2],[7,1],[6,1],[6,1],[6,1],[9,3],[9,4],[9,3],[15,1],[15,1],[15,1],[15,1],[15,2],[15,2],[15,2],[15,2],[15,2],[15,3],[15,2],[15,3],[14,2],[14,1],[27,1],[27,3],[30,1],[30,3],[33,3],[10,2],[10,4],[11,2]];
    table: Array<StateType> = [{3:1,4:2,6:3,7:4,8:$V0,9:5,10:6,11:7,12:$V1,19:$V2,34:$V3},{1:[3]},{5:[1,12],6:14,7:13,8:$V0,9:5,10:6,11:7,12:$V1,19:$V2,34:$V3},o($V4,[2,2]),o($V4,[2,3]),o($V4,[2,7]),o($V4,[2,8]),o($V4,[2,9]),o($V4,[2,6]),{13:[1,15]},{20:[1,16]},{20:[1,17]},{1:[2,1]},o($V4,[2,4]),o($V4,[2,5]),{12:$V5,13:[1,18],14:19,15:20,16:$V6,17:$V7,18:$V8,19:$V9,21:$Va,22:$Vb,23:$Vc,25:$Vd,28:$Ve,31:[1,21]},o($V4,[2,32],{35:[1,32]}),o($V4,[2,34]),o($V4,[2,10]),{13:[1,33],31:[1,34]},o($V4,[2,12]),o($Vf,[2,26]),o($Vg,[2,13]),o($Vg,[2,14]),o($Vg,[2,15]),o($Vg,[2,16]),{20:[1,35]},{20:[1,36]},{20:[1,37]},{24:[1,38]},{12:$V5,15:41,16:$V6,17:$V7,18:$V8,19:$V9,21:$Va,22:$Vb,23:$Vc,25:$Vd,26:[1,39],27:40,28:$Ve},{12:$Vh,29:[1,42],30:43,33:44},{20:[1,46]},o($V4,[2,11]),o($Vf,[2,25]),o($Vg,[2,17]),o($Vg,[2,18]),o($Vg,[2,19]),o($Vg,[2,20]),o($Vg,[2,21]),{26:[1,47],32:[1,48]},o($Vi,[2,27]),o($Vg,[2,23]),{29:[1,49],32:[1,50]},o($Vj,[2,29]),{23:[1,51]},o($V4,[2,33]),o($Vg,[2,22]),{12:$V5,15:52,16:$V6,17:$V7,18:$V8,19:$V9,21:$Va,22:$Vb,23:$Vc,25:$Vd,28:$Ve},o($Vg,[2,24]),{12:$Vh,33:53},{12:$V5,15:54,16:$V6,17:$V7,18:$V8,19:$V9,21:$Va,22:$Vb,23:$Vc,25:$Vd,28:$Ve},o($Vi,[2,28]),o($Vj,[2,30]),o($Vj,[2,31])];
    defaultActions: {[key:number]: any} = {12:[2,1]};

    performAction (yytext:string, yyleng:number, yylineno:number, yy:any, yystate:number /* action[1] */, $$:any /* vstack */, _$:any /* lstack */): any {
/* this == yyval */
          var $0 = $$.length - 1;
        switch (yystate) {
case 1:
 return $$[$0-1]
break;
case 2: case 27: case 29:
 this.$ = [$$[$0]];
break;
case 3:
 this.$ = [$$[$0]]
break;
case 4:
 this.$ = $$[$0-1].concat($$[$0])
break;
case 5:
 this.$ = $$[$0-1].concat($$[$0]);
break;
case 6:
 this.$ = new CommentNode($$[$0], yylineno + 1);
break;
case 7: case 8: case 9:
 this.$ = $$[$0];
break;
case 10:
 this.$ = new AssignmentNode($$[$0-2], new PLString('', yylineno + 1), yylineno + 1);
break;
case 11:
 this.$ = new AssignmentNode($$[$0-3], new PLString($$[$0-1], yylineno + 1), yylineno + 1);
break;
case 12:
 this.$ = new AssignmentNode($$[$0-2], $$[$0], yylineno + 1);
break;
case 13:
 this.$ = new PLNumber(Number($$[$0]), yylineno + 1);
break;
case 14:
 this.$ = new PLReference($$[$0], yylineno + 1);
break;
case 15:
 this.$ = new PLBoolean(Boolean($$[$0].toLowerCase()), yylineno + 1);
break;
case 16:
 this.$ = new PLString($$[$0].slice(1, -1), yylineno + 1);
break;
case 17:
 this.$ = new PLDict($$[$0], yylineno + 1);
break;
case 18:
 this.$ = new PLFileURL($$[$0], yylineno + 1);
break;
case 19:
 this.$ = new PLFileContent($$[$0], yylineno + 1);
break;
case 20:
 this.$ = new PLComponent($$[$0], yylineno + 1);
break;
case 21:
 this.$ = new PLArray([], yylineno + 1);
break;
case 22:
 this.$ = new PLArray($$[$0-1], yylineno + 1);
break;
case 23:
 this.$ = new PLObject([], yylineno + 1);
break;
case 24:
 this.$ = new PLObject($$[$0-1], yylineno + 1);
break;
case 25:
 this.$ = $$[$0-1] + $$[$0];
break;
case 28: case 30:
 this.$ = $$[$0-2].concat($$[$0]);
break;
case 31:
 this.$ = { key: $$[$0-2], value: $$[$0] };
break;
case 32:
 this.$ = new IncludeNode($$[$0], '', yylineno + 1);
break;
case 33:
 this.$ = new IncludeNode($$[$0-2], $$[$0], yylineno + 1);
break;
case 34:
 this.$ = new ExtendsNode($$[$0], yylineno + 1);
break;
        }
    }
}


/* generated by ts-jison-lex 0.3.0 */
import { JisonLexer, JisonLexerApi } from '@ts-jison/lexer';
export class PLLexer extends JisonLexer implements JisonLexerApi {
    options: any = {"moduleName":"PL"};
    constructor (yy = {}) {
        super(yy);
    }

    rules: RegExp[] = [/^(?:\s+)/,/^(?:\/\/.*)/,/^(?:\/\*([^*]|\*[^\/])*\*\/)/,/^(?:==)/,/^(?:=)/,/^(?:@copycontent\b)/,/^(?:@copyurl\b)/,/^(?:@include\b)/,/^(?:@extends\b)/,/^(?:as\b)/,/^(?:\/[^\s\n\,]+)/,/^(?:[+-]?\d+)/,/^(?:[,])/,/^(?:[:])/,/^(?:[\{])/,/^(?:[\}])/,/^(?:[\[])/,/^(?:[\]])/,/^(?:true|false|True|False\b)/,/^(?:wc-[a-zA-Z0-9_-]+)/,/^(?:[a-zA-Z_](\.?[a-zA-Z0-9_])*)/,/^(?:"([^\\\"]|\\.)*")/,/^(?:$)/,/^(?:\s==\s+)/,/^(?:\s+)/,/^(?:[^\s]*)/];
    conditions: any = {"MULTI":{"rules":[22,23,24,25],"inclusive":true},"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22],"inclusive":true}}
    performAction (yy:any,yy_:any,$avoiding_name_collisions:any,YY_START:any): any {
          var YYSTATE=YY_START;
        switch($avoiding_name_collisions) {
    case 0:/* ignore whitespace */
      break;
    case 1:return 8
      break;
    case 2:return 8
      break;
    case 3: this.begin('MULTI'); return 13;
      break;
    case 4:return 13
      break;
    case 5:return 22
      break;
    case 6:return 21
      break;
    case 7:return 34
      break;
    case 8:return 19
      break;
    case 9:return 35
      break;
    case 10:return 20 // COMMA AT THE END ALLOW TO INCLUDES PATH INSIDE ARRAY
      break;
    case 11:return 16
      break;
    case 12:return 32
      break;
    case 13:return 23
      break;
    case 14:return 28
      break;
    case 15:return 29
      break;
    case 16:return 25
      break;
    case 17:return 26
      break;
    case 18:return 17
      break;
    case 19:return 24
      break;
    case 20:return 12
      break;
    case 21:return 18
      break;
    case 22:return 5
      break;
    case 23:  this.popState(); return 13
      break;
    case 24:  return 31
      break;
    case 25:  return 31
      break;
        }
    }
}

