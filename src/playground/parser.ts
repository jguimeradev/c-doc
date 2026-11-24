// Recursive-descent parser producing a typed AST (types are computed while parsing).

import { CompileError, type Token } from './lexer.ts';
import {
  type CType, type Member, VOID, CHAR, SHORT, INT, UINT, LONG, ULONG, ptrTo, arrayOf,
  isInteger, isPointerLike, isScalar, sizeOf, alignOf, baseOf, commonType, promote, typeName,
} from './types.ts';

export interface Var {
  name: string;          // name in source
  label: string;         // assembler symbol (globals) or unique name (locals)
  ty: CType;
  global: boolean;
  offset: number;        // locals: distance below rbp
  line: number;
  isParam?: boolean;
  isStatic?: boolean;    // static local (lives in .data/.bss)
  init?: Init;
  defined?: boolean;     // globals: has a definition (not just extern)
  fn?: string;           // owning function for locals / static locals
}

export interface Init {
  line: number;
  expr?: Expr;
  list?: { field?: string; index?: number; init: Init }[];
}

export interface Expr {
  kind: string;
  ty: CType;
  line: number;
  val?: number;        // num
  str?: number;        // str: index into program strings
  v?: Var;             // var
  mem?: Member;        // member
  a?: Expr;
  b?: Expr;
  c?: Expr;
  op?: string;
  prefix?: boolean;
  name?: string;       // call
  args?: Expr[];
  fnTy?: CType;
  builtin?: boolean;
}

export interface Stmt {
  kind: string;
  line: number;
  body?: Stmt[];
  e?: Expr;
  then?: Stmt;
  els?: Stmt;
  init?: Stmt;
  cond?: Expr;
  inc?: Expr;
  s?: Stmt;
  v?: Var;
  val?: number;
  cases?: Stmt[];
  hasDefault?: boolean;
  initz?: Init;
  noScope?: boolean;
}

export interface Func {
  name: string;
  ty: CType & { k: 'func' };
  params: Var[];
  locals: Var[];
  body: Stmt;
  line: number;
  endLine: number;
  frameSize: number;
}

export interface Program {
  funcs: Func[];
  globals: Var[];
  strings: string[];
  usedBuiltins: Set<string>;
}

// ---- built-in library (implemented by the virtual machine) ----

const P = (t: CType) => ptrTo(t);
const VP = P(VOID), CP = P(CHAR);
const fn = (ret: CType, params: CType[], variadic = false): CType & { k: 'func' } => ({ k: 'func', ret, params, variadic });

export const BUILTINS: Record<string, CType & { k: 'func' }> = {
  printf: fn(INT, [CP], true),
  fprintf: fn(INT, [VP, CP], true),
  sprintf: fn(INT, [CP, CP], true),
  snprintf: fn(INT, [CP, ULONG, CP], true),
  puts: fn(INT, [CP]),
  fputs: fn(INT, [CP, VP]),
  putchar: fn(INT, [INT]),
  fputc: fn(INT, [INT, VP]),
  putc: fn(INT, [INT, VP]),
  getchar: fn(INT, []),
  scanf: fn(INT, [CP], true),
  malloc: fn(VP, [ULONG]),
  calloc: fn(VP, [ULONG, ULONG]),
  realloc: fn(VP, [VP, ULONG]),
  free: fn(VOID, [VP]),
  strlen: fn(ULONG, [CP]),
  strcpy: fn(CP, [CP, CP]),
  strncpy: fn(CP, [CP, CP, ULONG]),
  strcat: fn(CP, [CP, CP]),
  strcmp: fn(INT, [CP, CP]),
  strncmp: fn(INT, [CP, CP, ULONG]),
  strchr: fn(CP, [CP, INT]),
  strrchr: fn(CP, [CP, INT]),
  strstr: fn(CP, [CP, CP]),
  memset: fn(VP, [VP, INT, ULONG]),
  memcpy: fn(VP, [VP, VP, ULONG]),
  memmove: fn(VP, [VP, VP, ULONG]),
  memcmp: fn(INT, [VP, VP, ULONG]),
  abs: fn(INT, [INT]),
  labs: fn(LONG, [LONG]),
  rand: fn(INT, []),
  srand: fn(VOID, [UINT]),
  time: fn(LONG, [VP]),
  exit: fn(VOID, [INT]),
  abort: fn(VOID, []),
  atoi: fn(INT, [CP]),
  atol: fn(LONG, [CP]),
  strtol: fn(LONG, [CP, P(CP), INT]),
  strtoul: fn(ULONG, [CP, P(CP), INT]),
  strtok: fn(CP, [CP, CP]),
  perror: fn(VOID, [CP]),
  toupper: fn(INT, [INT]),
  tolower: fn(INT, [INT]),
  isdigit: fn(INT, [INT]),
  isalpha: fn(INT, [INT]),
  isalnum: fn(INT, [INT]),
  isspace: fn(INT, [INT]),
  isupper: fn(INT, [INT]),
  islower: fn(INT, [INT]),
  ispunct: fn(INT, [INT]),
  isxdigit: fn(INT, [INT]),
  isprint: fn(INT, [INT]),
  __assert_fail: fn(VOID, [CP, INT]),
};

/** Standard functions we know about but can't run, with a reason. */
const UNSUPPORTED: Record<string, string> = {
  fopen: 'there is no file system in the simulator',
  fclose: 'there is no file system in the simulator',
  fread: 'there is no file system in the simulator',
  fwrite: 'there is no file system in the simulator',
  fgets: 'there is no file system in the simulator; use getchar() to read the stdin box',
  fscanf: 'there is no file system in the simulator',
  open: 'system calls are not simulated',
  read: 'system calls are not simulated',
  write: 'system calls are not simulated',
  fork: 'processes are not simulated',
  qsort: 'it needs function pointers, which the simulator does not support',
  bsearch: 'it needs function pointers, which the simulator does not support',
  sqrt: 'floating point is not supported by the simulator',
  pow: 'floating point is not supported by the simulator',
  atof: 'floating point is not supported by the simulator',
  strtod: 'floating point is not supported by the simulator',
};

const isTypeStart = (t: Token, scope: Scope) =>
  (t.k === 'kw' && ['int', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'struct', 'union', 'enum',
    'typedef', 'const', 'static', 'extern', 'volatile', 'register', 'inline', 'float', 'double', '_Bool', 'bool', 'restrict'].includes(t.v)) ||
  (t.k === 'id' && scope.lookupTypedef(t.v) !== null);

interface ScopeEntry { v?: Var; typedef?: CType; enumVal?: number }

class Scope {
  vars: Map<string, ScopeEntry>[] = [new Map()];
  tags: Map<string, CType>[] = [new Map()];
  push() { this.vars.push(new Map()); this.tags.push(new Map()); }
  pop() { this.vars.pop(); this.tags.pop(); }
  lookup(name: string): ScopeEntry | null {
    for (let i = this.vars.length - 1; i >= 0; i--) {
      const e = this.vars[i].get(name);
      if (e) return e;
    }
    return null;
  }
  lookupTypedef(name: string): CType | null {
    const e = this.lookup(name);
    return e && e.typedef ? e.typedef : null;
  }
  lookupTag(name: string): CType | null {
    for (let i = this.tags.length - 1; i >= 0; i--) {
      const t = this.tags[i].get(name);
      if (t) return t;
    }
    return null;
  }
  declare(name: string, e: ScopeEntry) { this.vars[this.vars.length - 1].set(name, e); }
  declareTag(name: string, t: CType) { this.tags[this.tags.length - 1].set(name, t); }
  get depth() { return this.vars.length; }
}

interface DeclSpec { ty: CType; isTypedef: boolean; isStatic: boolean; isExtern: boolean }

export function parse(tokens: Token[], src: string): Program {
  let p = 0;
  const scope = new Scope();
  const globals: Var[] = [];
  const funcs: Func[] = [];
  const strings: string[] = [];
  const usedBuiltins = new Set<string>();
  const funcDecls = new Map<string, CType & { k: 'func' }>();
  let cur: Func | null = null;
  let staticCounter = 0;
  let anonCounter = 0;
  let loopDepth = 0, switchDepth = 0;
  const switchStack: Stmt[] = [];

  // FILE is an opaque type; stdin/stdout/stderr are fake handles 0/1/2.
  scope.declare('FILE', { typedef: VOID });
  scope.declare('size_t', { typedef: ULONG });
  scope.declare('ssize_t', { typedef: LONG });
  scope.declare('ptrdiff_t', { typedef: LONG });
  scope.declare('time_t', { typedef: LONG });
  scope.declare('int8_t', { typedef: CHAR });
  scope.declare('uint8_t', { typedef: { k: 'char', uns: true } });
  scope.declare('int16_t', { typedef: SHORT });
  scope.declare('uint16_t', { typedef: { k: 'short', uns: true } });
  scope.declare('int32_t', { typedef: INT });
  scope.declare('uint32_t', { typedef: UINT });
  scope.declare('int64_t', { typedef: LONG });
  scope.declare('uint64_t', { typedef: ULONG });

  const peek = (o = 0) => tokens[Math.min(p + o, tokens.length - 1)];
  const err = (msg: string, t: Token = peek()): never => { throw new CompileError(msg, t.line, t.col); };
  const is = (v: string, o = 0) => { const t = peek(o); return (t.k === 'op' || t.k === 'kw') && t.v === v; };
  const accept = (v: string) => { if (is(v)) { p++; return true; } return false; };
  const expect = (v: string, what?: string) => {
    if (!is(v)) err(`expected '${v}'${what ? ' ' + what : ''} before '${peek().v}'`);
    return tokens[p++];
  };
  const ident = (): Token => {
    const t = peek();
    if (t.k !== 'id') err(`expected identifier before '${t.v}'`);
    p++;
    return t;
  };

  // ---------- types ----------

  function declspec(): DeclSpec {
    let isTypedef = false, isStatic = false, isExtern = false;
    let base: CType | null = null;
    let uns: boolean | null = null;
    let size: '' | 'short' | 'long' | 'char' | 'int' = '';
    let sawInt = false;
    const start = peek();
    for (;;) {
      const t = peek();
      if (t.k === 'kw') {
        switch (t.v) {
          case 'typedef': isTypedef = true; p++; continue;
          case 'static': isStatic = true; p++; continue;
          case 'extern': isExtern = true; p++; continue;
          case 'const': case 'volatile': case 'register': case 'inline': case 'restrict': p++; continue;
          case 'unsigned': uns = true; p++; continue;
          case 'signed': uns = false; p++; continue;
          case 'short': size = 'short'; p++; continue;
          case 'long': size = 'long'; p++; continue;
          case 'char': size = 'char'; p++; continue;
          case 'int': sawInt = true; p++; continue;
          case 'void': base = VOID; p++; continue;
          case '_Bool': case 'bool': base = { k: 'char', uns: true }; p++; continue;
          case 'float': case 'double':
            err('floating-point types are not supported by the simulator (integers, chars and pointers only)');
            break;
          case 'union': err('unions are not supported by the simulator'); break;
          case 'struct': base = structDecl(); continue;
          case 'enum': base = enumDecl(); continue;
        }
      }
      if (t.k === 'id' && base === null && size === '' && uns === null && !sawInt) {
        const td = scope.lookupTypedef(t.v);
        if (td) { base = td; p++; continue; }
      }
      break;
    }
    if (base === null) {
      if (size === '' && uns === null && !sawInt) err(`expected a type before '${start.v}'`, start);
      const kind = size === '' ? 'int' : size;
      base = { k: kind, uns: uns ?? false } as CType;
    }
    return { ty: base, isTypedef, isStatic, isExtern };
  }

  function structDecl(): CType {
    expect('struct');
    let tag = '';
    if (peek().k === 'id') tag = ident().v;
    if (!is('{')) {
      if (!tag) err('expected struct tag or {');
      const found = scope.lookupTag(tag);
      if (found) return found;
      const incomplete: CType = { k: 'struct', tag, members: [], size: 0, align: 1, complete: false };
      scope.declareTag(tag, incomplete);
      return incomplete;
    }
    // definition
    let st = tag ? (scope.tags[scope.tags.length - 1].get(tag) as (CType & { k: 'struct' }) | undefined) : undefined;
    if (!st || st.complete) {
      st = { k: 'struct', tag: tag || `<anonymous#${++anonCounter}>`, members: [], size: 0, align: 1, complete: false };
      if (tag) scope.declareTag(tag, st);
    }
    expect('{');
    let offset = 0, align = 1;
    while (!accept('}')) {
      const spec = declspec();
      do {
        const { ty, name } = declarator(spec.ty);
        if (!name) err('expected member name');
        if (ty.k === 'struct' && !ty.complete) err(`field '${name!.v}' has incomplete type`, name!);
        if (ty.k === 'func') err('functions cannot be struct members', name!);
        const a = alignOf(ty);
        offset = Math.ceil(offset / a) * a;
        st.members.push({ name: name!.v, ty, offset });
        offset += sizeOf(ty);
        align = Math.max(align, a);
      } while (accept(','));
      expect(';', 'after struct member');
    }
    st.size = Math.ceil(offset / align) * align;
    st.align = align;
    st.complete = true;
    return st;
  }

  function enumDecl(): CType {
    expect('enum');
    if (peek().k === 'id') ident();
    if (!accept('{')) return INT;
    let val = 0;
    while (!accept('}')) {
      const name = ident();
      if (accept('=')) val = constExpr();
      scope.declare(name.v, { enumVal: val });
      val++;
      if (!accept(',')) { expect('}'); break; }
    }
    return INT;
  }

  function pointers(ty: CType): CType {
    while (accept('*')) {
      ty = ptrTo(ty);
      while (accept('const') || accept('volatile') || accept('restrict'));
    }
    return ty;
  }

  function declarator(base: CType): { ty: CType; name: Token | null; params?: Var[] } {
    let ty = pointers(base);
    if (is('(') && is('*', 1)) err('function pointers are not supported by the simulator');
    let name: Token | null = null;
    if (peek().k === 'id') name = ident();
    const r = typeSuffix(ty);
    return { ty: r.ty, name, params: r.params };
  }

  function abstractDeclarator(base: CType): CType {
    let ty = pointers(base);
    if (is('(') && is('*', 1)) err('function pointers are not supported by the simulator');
    return typeSuffix(ty).ty;
  }

  function typeSuffix(ty: CType): { ty: CType; params?: Var[] } {
    if (accept('[')) {
      let len = -1;
      if (!is(']')) len = constExpr();
      expect(']');
      const inner = typeSuffix(ty).ty;
      if (len === 0 || len < -1) err('array size must be positive');
      return { ty: arrayOf(inner, len) };
    }
    if (accept('(')) {
      const params: Var[] = [];
      const ptys: CType[] = [];
      let variadic = false;
      if (is('void') && is(')', 1)) { p++; }
      while (!accept(')')) {
        if (params.length > 0) expect(',');
        if (accept('...')) { variadic = true; expect(')'); break; }
        const spec = declspec();
        const d = declarator(spec.ty);
        let pty = d.ty;
        if (pty.k === 'array') pty = ptrTo(pty.of);          // arrays decay in parameters
        if (pty.k === 'struct') err('passing structs by value is not supported by the simulator; pass a pointer instead', d.name ?? peek());
        if (pty.k === 'void') err('parameter has void type', d.name ?? peek());
        ptys.push(pty);
        params.push({ name: d.name ? d.name.v : `<param${params.length}>`, label: '', ty: pty, global: false, offset: 0, line: (d.name ?? peek()).line, isParam: true });
      }
      if (ty.k === 'struct') err('returning structs by value is not supported by the simulator; return a pointer instead');
      if (ty.k === 'array') err('functions cannot return arrays');
      return { ty: { k: 'func', ret: ty, params: ptys, variadic }, params };
    }
    return { ty };
  }

  function typeName_(): CType {
    const spec = declspec();
    return abstractDeclarator(spec.ty);
  }

  // ---------- constant expressions ----------

  function constExpr(): number {
    const e = conditional();
    return evalConst(e);
  }

  function evalConst(e: Expr): number {
    const t = { line: e.line, col: 1 };
    const fail = (): never => { throw new CompileError('expected a constant expression', t.line, t.col); };
    switch (e.kind) {
      case 'num': return e.val!;
      case 'cast': return evalConst(e.a!);
      case 'neg': return -evalConst(e.a!);
      case 'not': return evalConst(e.a!) ? 0 : 1;
      case 'bitnot': return ~evalConst(e.a!);
      case 'cond': return evalConst(e.a!) ? evalConst(e.b!) : evalConst(e.c!);
      case 'logand': return evalConst(e.a!) && evalConst(e.b!) ? 1 : 0;
      case 'logor': return evalConst(e.a!) || evalConst(e.b!) ? 1 : 0;
      case 'binop': {
        const a = evalConst(e.a!), b = evalConst(e.b!);
        switch (e.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': if (b === 0) fail(); return Math.trunc(a / b);
          case '%': if (b === 0) fail(); return a % b;
          case '<<': return a * 2 ** b; case '>>': return Math.floor(a / 2 ** b);
          case '&': return a & b; case '|': return a | b; case '^': return a ^ b;
          case '<': return +(a < b); case '>': return +(a > b); case '<=': return +(a <= b);
          case '>=': return +(a >= b); case '==': return +(a === b); case '!=': return +(a !== b);
        }
      }
    }
    return fail();
  }

  // ---------- expressions ----------

  const mk = (kind: string, ty: CType, line: number, extra: Partial<Expr> = {}): Expr => ({ kind, ty, line, ...extra });
  const decay = (t: CType): CType => (t.k === 'array' ? ptrTo(t.of) : t);
  const isLvalue = (e: Expr) => e.kind === 'var' || e.kind === 'deref' || e.kind === 'member' || e.kind === 'str';

  function checkScalar(e: Expr, what: string, t: Token) {
    if (!isScalar(decay(e.ty))) err(`${what} requires a scalar value, but the operand has type '${typeName(e.ty)}'`, t);
  }

  function binary(op: string, a: Expr, b: Expr, t: Token): Expr {
    const at = decay(a.ty), bt = decay(b.ty);
    const line = t.line;
    if (op === '+' || op === '-') {
      if (isInteger(at) && isInteger(bt)) return mk('binop', commonType(at, bt), line, { op, a, b });
      if (at.k === 'ptr' && isInteger(bt)) {
        if (at.to.k === 'void') err('arithmetic on a void pointer', t);
        return mk('binop', at, line, { op, a, b });
      }
      if (op === '+' && isInteger(at) && bt.k === 'ptr') return mk('binop', bt, line, { op, a: b, b: a });
      if (op === '-' && at.k === 'ptr' && bt.k === 'ptr') return mk('binop', LONG, line, { op: 'ptrdiff', a, b });
      err(`invalid operands to binary ${op} ('${typeName(a.ty)}' and '${typeName(b.ty)}')`, t);
    }
    if (['*', '/', '%', '&', '|', '^'].includes(op)) {
      if (!isInteger(at) || !isInteger(bt)) err(`invalid operands to binary ${op} ('${typeName(a.ty)}' and '${typeName(b.ty)}')`, t);
      return mk('binop', commonType(at, bt), line, { op, a, b });
    }
    if (op === '<<' || op === '>>') {
      if (!isInteger(at) || !isInteger(bt)) err(`invalid operands to binary ${op}`, t);
      return mk('binop', promote(at), line, { op, a, b });
    }
    // comparisons
    if (isInteger(at) && isInteger(bt)) return mk('binop', INT, line, { op, a, b });
    if (isPointerLike(at) || isPointerLike(bt)) return mk('binop', INT, line, { op, a, b });
    return err(`invalid operands to binary ${op}`, t);
  }

  function expr(): Expr {
    let e = assign();
    while (is(',')) {
      const t = tokens[p++];
      const b = assign();
      e = mk('comma', b.ty, t.line, { a: e, b });
    }
    return e;
  }

  function assign(): Expr {
    const lhs = conditional();
    const t = peek();
    if (t.k === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].includes(t.v)) {
      p++;
      const rhs = assign();
      if (!isLvalue(lhs) || lhs.kind === 'str') err('lvalue required as left operand of assignment', t);
      if (lhs.ty.k === 'array') err('assignment to an array; copy elements individually or use memcpy/strcpy', t);
      if (t.v === '=') {
        if (lhs.ty.k === 'struct') {
          if (rhs.ty !== lhs.ty) err(`incompatible types when assigning to type '${typeName(lhs.ty)}'`, t);
        } else checkAssignable(lhs.ty, rhs, t);
        return mk('assign', lhs.ty, t.line, { a: lhs, b: rhs });
      }
      const op = t.v.slice(0, -1);
      const shape = binary(op, lhs, rhs, t); // type-check
      return mk('opassign', lhs.ty, t.line, { op, a: lhs, b: rhs, c: shape });
    }
    return lhs;
  }

  function checkAssignable(to: CType, from: Expr, t: Token) {
    const ft = decay(from.ty);
    if (to.k === 'struct') err('assigning a non-struct to a struct', t);
    if (isInteger(to) && ft.k === 'ptr') err(`assignment makes integer from pointer without a cast (to '${typeName(to)}' from '${typeName(from.ty)}')`, t);
    if (to.k === 'ptr' && isInteger(ft) && !(from.kind === 'num' && from.val === 0)) {
      err(`assignment makes pointer from integer without a cast (to '${typeName(to)}' from '${typeName(from.ty)}')`, t);
    }
    if (ft.k === 'void') err('void value not ignored as it ought to be', t);
  }

  function conditional(): Expr {
    const c = logor();
    if (!is('?')) return c;
    const t = tokens[p++];
    const a = expr();
    expect(':');
    const b = conditional();
    const at = decay(a.ty), bt = decay(b.ty);
    let ty: CType;
    if (isInteger(at) && isInteger(bt)) ty = commonType(at, bt);
    else if (at.k === 'ptr') ty = at;
    else if (bt.k === 'ptr') ty = bt;
    else if (at.k === 'void' && bt.k === 'void') ty = VOID;
    else ty = at;
    return mk('cond', ty, t.line, { a: c, b: a, c: b });
  }

  function logor(): Expr {
    let e = logand();
    while (is('||')) { const t = tokens[p++]; const b = logand(); checkScalar(e, '||', t); checkScalar(b, '||', t); e = mk('logor', INT, t.line, { a: e, b }); }
    return e;
  }
  function logand(): Expr {
    let e = bitor();
    while (is('&&')) { const t = tokens[p++]; const b = bitor(); checkScalar(e, '&&', t); checkScalar(b, '&&', t); e = mk('logand', INT, t.line, { a: e, b }); }
    return e;
  }
  function leftAssoc(next: () => Expr, ops: string[]): () => Expr {
    return () => {
      let e = next();
      for (;;) {
        const t = peek();
        if (t.k === 'op' && ops.includes(t.v)) { p++; e = binary(t.v, e, next(), t); } else return e;
      }
    };
  }
  const mul = (): Expr => leftAssoc(cast, ['*', '/', '%'])();
  const add = leftAssoc(mul, ['+', '-']);
  const shift = leftAssoc(add, ['<<', '>>']);
  const relational = leftAssoc(shift, ['<', '<=', '>', '>=']);
  const equality = leftAssoc(relational, ['==', '!=']);
  const bitand = leftAssoc(equality, ['&']);
  const bitxor = leftAssoc(bitand, ['^']);
  const bitor = leftAssoc(bitxor, ['|']);

  function cast(): Expr {
    if (is('(') && isTypeStart(peek(1), scope)) {
      const t = tokens[p++];
      const ty = typeName_();
      expect(')');
      if (is('{')) err('compound literals are not supported by the simulator');
      const e = cast();
      if (ty.k === 'struct' || ty.k === 'array') err(`cannot cast to type '${typeName(ty)}'`, t);
      if (ty.k !== 'void') checkScalar(e, 'a cast', t);
      return mk('cast', ty, t.line, { a: e });
    }
    return unary();
  }

  function unary(): Expr {
    const t = peek();
    if (t.k === 'op') {
      switch (t.v) {
        case '+': { p++; const e = cast(); return mk('cast', promote(decay(e.ty)), t.line, { a: e }); }
        case '-': {
          p++; const e = cast();
          if (!isInteger(decay(e.ty))) err('wrong type argument to unary minus', t);
          if (e.kind === 'num') return { ...e, val: -e.val!, ty: promote(e.ty) };
          return mk('neg', promote(e.ty), t.line, { a: e });
        }
        case '!': { p++; const e = cast(); checkScalar(e, '!', t); return mk('not', INT, t.line, { a: e }); }
        case '~': { p++; const e = cast(); if (!isInteger(e.ty)) err('wrong type argument to bit-complement', t); return mk('bitnot', promote(e.ty), t.line, { a: e }); }
        case '*': {
          p++; const e = cast();
          const bt = baseOf(e.ty);
          if (!bt) err(`invalid type argument of unary '*' (have '${typeName(e.ty)}')`, t);
          if (bt!.k === 'void') err("dereferencing a 'void *' pointer", t);
          if (bt!.k === 'func') err('function pointers are not supported by the simulator', t);
          return mk('deref', bt!, t.line, { a: e });
        }
        case '&': {
          p++; const e = cast();
          if (!isLvalue(e)) err("lvalue required as unary '&' operand", t);
          return mk('addr', ptrTo(e.ty), t.line, { a: e });
        }
        case '++': case '--': {
          p++; const e = unary();
          if (!isLvalue(e) || e.kind === 'str') err(`lvalue required as ${t.v === '++' ? 'increment' : 'decrement'} operand`, t);
          checkScalar(e, t.v, t);
          return mk('incdec', e.ty, t.line, { a: e, op: t.v, prefix: true });
        }
      }
    }
    if (t.k === 'kw' && t.v === 'sizeof') {
      p++;
      let ty: CType;
      if (is('(') && isTypeStart(peek(1), scope)) { p++; ty = typeName_(); expect(')'); }
      else ty = unary().ty;
      if (ty.k === 'struct' && !ty.complete) err(`invalid application of 'sizeof' to incomplete type '${typeName(ty)}'`, t);
      if (ty.k === 'array' && ty.len < 0) err('sizeof applied to an array of unknown size', t);
      return mk('num', ULONG, t.line, { val: sizeOf(ty) });
    }
    return postfix();
  }

  function postfix(): Expr {
    let e = primary();
    for (;;) {
      const t = peek();
      if (accept('[')) {
        const idx = expr();
        expect(']');
        const sum = binary('+', e, idx, t);
        const bt = baseOf(decay(sum.ty));
        if (!bt) err('subscripted value is neither array nor pointer', t);
        e = mk('deref', bt!, t.line, { a: sum });
      } else if (accept('.') || accept('->')) {
        let obj = e;
        if (t.v === '->') {
          const bt = baseOf(e.ty);
          if (!bt || bt.k !== 'struct') err(`invalid type argument of '->' (have '${typeName(e.ty)}')`, t);
          obj = mk('deref', bt!, t.line, { a: e });
        }
        if (obj.ty.k !== 'struct') err(`request for member in something not a structure (type '${typeName(obj.ty)}')`, t);
        const st = obj.ty as CType & { k: 'struct' };
        if (!st.complete) err(`dereferencing pointer to incomplete type '${typeName(st)}'`, t);
        const name = ident();
        const mem = st.members.find((m) => m.name === name.v);
        if (!mem) err(`'${typeName(st)}' has no member named '${name.v}'`, name);
        e = mk('member', mem!.ty, t.line, { a: obj, mem });
      } else if (is('++') || is('--')) {
        p++;
        if (!isLvalue(e) || e.kind === 'str') err(`lvalue required as ${t.v === '++' ? 'increment' : 'decrement'} operand`, t);
        checkScalar(e, t.v, t);
        e = mk('incdec', e.ty, t.line, { a: e, op: t.v, prefix: false });
      } else if (is('(')) {
        err('called object is not a function', t);
      } else return e;
    }
  }

  function call(name: Token): Expr {
    expect('(');
    const args: Expr[] = [];
    while (!accept(')')) {
      if (args.length > 0) expect(',');
      args.push(assign());
    }
    const entry = scope.lookup(name.v);
    if (entry && entry.v && !entry.v.global) err(`called object '${name.v}' is not a function`, name);
    let fty = funcDecls.get(name.v);
    let builtin = false;
    if (!fty && BUILTINS[name.v]) { fty = BUILTINS[name.v]; builtin = true; usedBuiltins.add(name.v); }
    if (!fty) {
      if (UNSUPPORTED[name.v]) err(`'${name.v}' is not available here: ${UNSUPPORTED[name.v]}`, name);
      err(`implicit declaration of function '${name.v}' (declare it before calling it)`, name);
    }
    if (args.length < fty!.params.length || (!fty!.variadic && args.length > fty!.params.length)) {
      err(`${args.length < fty!.params.length ? 'too few' : 'too many'} arguments to function '${name.v}' (expected ${fty!.params.length}${fty!.variadic ? '+' : ''}, got ${args.length})`, name);
    }
    if (args.length > 16) err('the simulator supports at most 16 arguments per call', name);
    args.forEach((a, i) => {
      if (a.ty.k === 'struct') err('passing structs by value is not supported by the simulator; pass a pointer instead', name);
      if (i < fty!.params.length) checkAssignable(fty!.params[i], a, name);
      else if (decay(a.ty).k === 'void') err('void value passed as an argument', name);
    });
    return mk('call', fty!.ret, name.line, { name: name.v, args, fnTy: fty, builtin });
  }

  function primary(): Expr {
    const t = peek();
    if (accept('(')) {
      if (is('{')) err('statement expressions are not supported');
      const e = expr();
      expect(')');
      return e;
    }
    if (t.k === 'num') {
      p++;
      const s = t.suffix ?? '';
      const v = t.num!;
      const u = s.includes('u');
      const nonDecimal = /^0/.test(t.v) && t.v !== '0';
      let ty: CType;
      if (s.includes('l') || v > 0xffffffff) ty = u ? ULONG : LONG;
      else if (u) ty = UINT;
      else if (v > 0x7fffffff) ty = nonDecimal ? UINT : LONG;
      else ty = INT;
      return mk('num', ty, t.line, { val: v });
    }
    if (t.k === 'char') { p++; return mk('num', INT, t.line, { val: t.num }); }
    if (t.k === 'str') {
      let s = '';
      while (peek().k === 'str') s += tokens[p++].v;
      strings.push(s);
      return mk('str', arrayOf(CHAR, s.length + 1), t.line, { str: strings.length - 1 });
    }
    if (t.k === 'id') {
      p++;
      if (is('(')) {
        if (t.v === 'assert') return assertCall(t);
        p--;
        return call(ident());
      }
      const e = scope.lookup(t.v);
      if (e?.enumVal !== undefined) return mk('num', INT, t.line, { val: e.enumVal });
      if (e?.v) return mk('var', e.v.ty, t.line, { v: e.v });
      if (funcDecls.has(t.v) || BUILTINS[t.v]) err(`using function '${t.v}' as a value needs function pointers, which the simulator does not support`, t);
      if (t.v === 'stdout' || t.v === 'stderr' || t.v === 'stdin') {
        return mk('cast', VP, t.line, { a: mk('num', LONG, t.line, { val: t.v === 'stdin' ? 0 : t.v === 'stdout' ? 1 : 2 }) });
      }
      err(`'${t.v}' undeclared`, t);
    }
    if (t.k === 'kw' && t.v === 'sizeof') return unary();
    return err(`expected expression before '${t.v}'`, t);
  }

  function assertCall(name: Token): Expr {
    expect('(');
    const startTok = peek();
    const cond = assign();
    const endTok = tokens[p - 1];
    expect(')');
    checkScalar(cond, 'assert', name);
    const text = src.slice(startTok.pos, endTok.pos + (endTok.k === 'str' ? endTok.v.length + 2 : endTok.v.length));
    strings.push(text);
    usedBuiltins.add('__assert_fail');
    // assert(c)  ==>  c ? (void)0 : __assert_fail("c", line)
    const fail = mk('call', VOID, name.line, {
      name: '__assert_fail', builtin: true, fnTy: BUILTINS.__assert_fail,
      args: [mk('str', arrayOf(CHAR, text.length + 1), name.line, { str: strings.length - 1 }), mk('num', INT, name.line, { val: name.line })],
    });
    return mk('cond', VOID, name.line, { a: cond, b: mk('cast', VOID, name.line, { a: mk('num', INT, name.line, { val: 0 }) }), c: fail });
  }

  // ---------- initializers ----------

  function initializer(ty: CType): Init {
    const line = peek().line;
    if (is('{')) {
      p++;
      const list: { field?: string; index?: number; init: Init }[] = [];
      while (!accept('}')) {
        let field: string | undefined, index: number | undefined;
        if (accept('.')) { field = ident().v; expect('='); }
        else if (is('[')) { p++; index = constExpr(); expect(']'); expect('='); }
        const sub = ty.k === 'array' ? ty.of : ty.k === 'struct' ? (field ? ty.members.find((m) => m.name === field)?.ty ?? INT : ty.members[list.length]?.ty ?? INT) : ty;
        list.push({ field, index, init: initializer(sub) });
        if (!accept(',')) { expect('}'); break; }
      }
      return { line, list };
    }
    return { line, expr: assign() };
  }

  /** Fill in an unsized array length from its initializer and check shapes. */
  function fixArrayLen(ty: CType, init: Init | undefined, t: Token): CType {
    if (ty.k !== 'array') return ty;
    if (ty.len < 0) {
      if (!init) err('array size missing', t);
      if (init!.expr && init!.expr.kind === 'str') return arrayOf(ty.of, strings[init!.expr.str!].length + 1);
      if (init!.list) {
        let n = 0, i = 0;
        for (const it of init!.list) { i = it.index ?? i; n = Math.max(n, i + 1); i++; }
        return arrayOf(ty.of, n);
      }
      err('invalid initializer for array', t);
    }
    return ty;
  }

  // ---------- statements ----------

  function declareLocal(name: Token, ty: CType): Var {
    if (scope.vars[scope.depth - 1].has(name.v)) err(`redeclaration of '${name.v}'`, name);
    const v: Var = { name: name.v, label: name.v, ty, global: false, offset: 0, line: name.line, fn: cur!.name };
    cur!.locals.push(v);
    scope.declare(name.v, { v });
    return v;
  }

  function localDecl(): Stmt {
    const line = peek().line;
    const spec = declspec();
    const stmts: Stmt[] = [];
    if (accept(';')) return { kind: 'nop', line };
    do {
      const d = declarator(spec.ty);
      if (!d.name) err('expected identifier in declaration');
      if (spec.isTypedef) { scope.declare(d.name!.v, { typedef: d.ty }); continue; }
      if (d.ty.k === 'func') { funcDecls.set(d.name!.v, d.ty as CType & { k: 'func' }); continue; }
      if (d.ty.k === 'void') err(`variable '${d.name!.v}' declared void`, d.name!);
      if (d.ty.k === 'struct' && !d.ty.complete) err(`storage size of '${d.name!.v}' isn't known`, d.name!);
      // the name is in scope inside its own initializer (e.g. p = malloc(sizeof *p))
      let v: Var;
      if (spec.isStatic) {
        v = { name: d.name!.v, label: `${d.name!.v}.${++staticCounter}`, ty: d.ty, global: true, offset: 0, line: d.name!.line, isStatic: true, defined: true, fn: cur!.name };
        globals.push(v);
        scope.declare(d.name!.v, { v });
      } else v = declareLocal(d.name!, d.ty);
      let init: Init | undefined;
      if (accept('=')) init = initializer(d.ty);
      if (init?.expr && d.ty.k !== 'array' && d.ty.k !== 'struct') checkAssignable(d.ty, init.expr, d.name!);
      v.ty = fixArrayLen(d.ty, init, d.name!);
      if (spec.isStatic) { v.init = init; continue; }
      if (init) stmts.push({ kind: 'decl', line: d.name!.line, v, initz: init });
    } while (accept(','));
    expect(';', 'after declaration');
    if (stmts.length === 1) return stmts[0];
    return { kind: 'block', line, body: stmts, noScope: true };
  }

  function statement(): Stmt {
    const t = peek();
    const line = t.line;
    if (t.k === 'kw') {
      switch (t.v) {
        case 'return': {
          p++;
          const ret = (cur!.ty as CType & { k: 'func' }).ret;
          if (accept(';')) {
            if (ret.k !== 'void' && cur!.name !== 'main') err(`'return' with no value in function returning '${typeName(ret)}'`, t);
            return { kind: 'return', line };
          }
          const e = expr();
          expect(';', 'after return value');
          if (ret.k === 'void') err("'return' with a value in function returning void", t);
          else checkAssignable(ret, e, t);
          return { kind: 'return', line, e };
        }
        case 'if': {
          p++; expect('('); const cond = expr(); expect(')');
          checkScalar(cond, 'if', t);
          const then = statement();
          const els = accept('else') ? statement() : undefined;
          return { kind: 'if', line, cond, then, els };
        }
        case 'while': {
          p++; expect('('); const cond = expr(); expect(')');
          checkScalar(cond, 'while', t);
          loopDepth++; const s = statement(); loopDepth--;
          return { kind: 'while', line, cond, s };
        }
        case 'do': {
          p++;
          loopDepth++; const s = statement(); loopDepth--;
          const wt = expect('while'); expect('('); const cond = expr(); expect(')'); expect(';');
          return { kind: 'do', line, cond, s, val: wt.line };
        }
        case 'for': {
          p++; expect('(');
          scope.push();
          let init: Stmt | undefined;
          if (!accept(';')) {
            if (isTypeStart(peek(), scope)) init = localDecl();
            else { const e = expr(); expect(';'); init = { kind: 'expr', line: e.line, e }; }
          }
          const cond = is(';') ? undefined : expr();
          expect(';');
          const inc = is(')') ? undefined : expr();
          expect(')');
          loopDepth++; const s = statement(); loopDepth--;
          scope.pop();
          return { kind: 'for', line, init, cond, inc, s };
        }
        case 'break':
          p++; expect(';');
          if (loopDepth === 0 && switchDepth === 0) err('break statement not within loop or switch', t);
          return { kind: 'break', line };
        case 'continue':
          p++; expect(';');
          if (loopDepth === 0) err('continue statement not within a loop', t);
          return { kind: 'continue', line };
        case 'switch': {
          p++; expect('('); const cond = expr(); expect(')');
          if (!isInteger(decay(cond.ty))) err('switch quantity not an integer', t);
          const sw: Stmt = { kind: 'switch', line, cond, cases: [], hasDefault: false };
          switchStack.push(sw); switchDepth++;
          sw.s = statement();
          switchStack.pop(); switchDepth--;
          return sw;
        }
        case 'case': {
          p++;
          if (!switchStack.length) err("case label not within a switch statement", t);
          const val = constExpr();
          expect(':');
          const c: Stmt = { kind: 'case', line, val };
          switchStack[switchStack.length - 1].cases!.push(c);
          c.s = is('}') ? { kind: 'nop', line } : statement();
          return c;
        }
        case 'default': {
          p++; expect(':');
          if (!switchStack.length) err("'default' label not within a switch statement", t);
          const sw = switchStack[switchStack.length - 1];
          if (sw.hasDefault) err('multiple default labels in one switch', t);
          sw.hasDefault = true;
          const c: Stmt = { kind: 'default', line };
          sw.cases!.push(c);
          c.s = is('}') ? { kind: 'nop', line } : statement();
          return c;
        }
        case 'goto': err('goto is not supported by the simulator'); break;
        case 'else': err("'else' without a previous 'if'"); break;
      }
    }
    if (is('{')) return block();
    if (accept(';')) return { kind: 'nop', line };
    if (isTypeStart(t, scope)) return localDecl();
    const e = expr();
    expect(';', 'after expression');
    return { kind: 'expr', line, e };
  }

  function block(): Stmt {
    const line = expect('{').line;
    scope.push();
    const body: Stmt[] = [];
    while (!is('}')) {
      if (peek().k === 'eof') err("expected '}' at end of input");
      body.push(statement());
    }
    const end = tokens[p++];
    scope.pop();
    return { kind: 'block', line, body, val: end.line };
  }

  // ---------- top level ----------

  while (peek().k !== 'eof') {
    const spec = declspec();
    if (accept(';')) continue; // struct/enum declaration
    let first = true;
    for (;;) {
      const d = declarator(spec.ty);
      if (!d.name) err('expected identifier');
      const name = d.name!;
      if (spec.isTypedef) {
        scope.declare(name.v, { typedef: d.ty });
      } else if (d.ty.k === 'func') {
        const fty = d.ty as CType & { k: 'func' };
        const prev = funcDecls.get(name.v);
        if (prev && (prev.params.length !== fty.params.length)) err(`conflicting types for '${name.v}'`, name);
        if (BUILTINS[name.v] && is('{')) err(`'${name.v}' is a standard library function; choose another name`, name);
        funcDecls.set(name.v, fty);
        if (first && is('{')) {
          if (funcs.some((f) => f.name === name.v)) err(`redefinition of '${name.v}'`, name);
          const f: Func = { name: name.v, ty: fty, params: [], locals: [], body: { kind: 'nop', line: 0 }, line: name.line, endLine: name.line, frameSize: 0 };
          cur = f;
          scope.push();
          for (const pv of d.params ?? []) {
            pv.fn = f.name;
            pv.label = pv.name;
            f.params.push(pv);
            f.locals.push(pv);
            if (!pv.name.startsWith('<')) scope.declare(pv.name, { v: pv });
          }
          f.body = block();
          f.endLine = tokens[p - 1].line;
          scope.pop();
          cur = null;
          funcs.push(f);
          break;
        }
      } else {
        if (d.ty.k === 'void') err(`variable '${name.v}' declared void`, name);
        let init: Init | undefined;
        if (accept('=')) init = initializer(d.ty);
        if (init?.expr && d.ty.k !== 'array' && d.ty.k !== 'struct') checkAssignable(d.ty, init.expr, name);
        const ty = fixArrayLen(d.ty, init, name);
        if (ty.k === 'struct' && !ty.complete && !spec.isExtern) err(`storage size of '${name.v}' isn't known`, name);
        const existing = globals.find((g) => g.name === name.v && !g.isStatic);
        if (existing) {
          if (init && existing.init) err(`redefinition of '${name.v}'`, name);
          if (init) existing.init = init;
          if (!spec.isExtern) existing.defined = true;
          existing.ty = ty;
        } else {
          const v: Var = { name: name.v, label: name.v, ty, global: true, offset: 0, line: name.line, init, defined: !spec.isExtern, isStatic: false };
          globals.push(v);
          scope.declare(name.v, { v });
        }
      }
      first = false;
      if (accept(',')) continue;
      expect(';', 'after top-level declaration');
      break;
    }
  }

  if (!funcs.some((f) => f.name === 'main')) {
    throw new CompileError("undefined reference to 'main' (every program needs an int main(void))", 1, 1);
  }
  for (const [name] of funcDecls) {
    // calls to declared-but-undefined functions are caught by the linker step in codegen
    void name;
  }
  for (const g of globals) {
    if (!g.defined && !g.isStatic) throw new CompileError(`undefined reference to '${g.name}' (declared extern but never defined)`, g.line, 1);
  }
  return { funcs, globals, strings, usedBuiltins };
}
