// Code generator: typed AST -> x86-64 (Intel syntax, GCC -O0 style) for the simulated machine.

import { CompileError } from './lexer.ts';
import type { Program, Var, Expr, Stmt, Init } from './parser.ts';
import { BUILTINS } from './parser.ts';
import {
  type CType, LONG, INT, isInteger, isUnsigned, sizeOf, alignOf, baseOf, promote, typeName,
} from './types.ts';

// ---------- machine description ----------

export const REG_NAMES = ['rax', 'rcx', 'rdx', 'rbx', 'rsi', 'rdi', 'r8', 'r9', 'r10', 'r11', 'rsp', 'rbp'] as const;
const SUB: Record<string, [string, string, string, string]> = {
  rax: ['al', 'ax', 'eax', 'rax'], rcx: ['cl', 'cx', 'ecx', 'rcx'], rdx: ['dl', 'dx', 'edx', 'rdx'],
  rbx: ['bl', 'bx', 'ebx', 'rbx'], rsi: ['sil', 'si', 'esi', 'rsi'], rdi: ['dil', 'di', 'edi', 'rdi'],
  r8: ['r8b', 'r8w', 'r8d', 'r8'], r9: ['r9b', 'r9w', 'r9d', 'r9'], r10: ['r10b', 'r10w', 'r10d', 'r10'],
  r11: ['r11b', 'r11w', 'r11d', 'r11'], rsp: ['spl', 'sp', 'esp', 'rsp'], rbp: ['bpl', 'bp', 'ebp', 'rbp'],
};
const SIZE_IDX: Record<number, number> = { 1: 0, 2: 1, 4: 2, 8: 3 };
const PTR_WORD: Record<number, string> = { 1: 'BYTE', 2: 'WORD', 4: 'DWORD', 8: 'QWORD' };
const ARG_REGS = ['rdi', 'rsi', 'rdx', 'rcx', 'r8', 'r9'];

export type Size = 1 | 2 | 4 | 8;

export interface Opnd {
  t: 'reg' | 'imm' | 'mem' | 'lbl' | 'sym';
  r?: number;           // reg index
  size?: Size;
  v?: number;           // imm
  base?: number;        // mem: base register index, or -1 for rip-relative symbol
  disp?: number;        // mem: displacement
  sym?: string;         // mem (rip-relative), lbl, sym
  abs?: number;         // resolved absolute address for rip-relative symbols
  target?: number;      // resolved instruction index for lbl
}

export interface Inst {
  op: string;
  a?: Opnd;
  b?: Opnd;
  c?: Opnd;
  line: number;
  stmt: boolean;
  fn: string;
  addr: number;
  size: number;
  text: string;
}

export interface ListingRow {
  kind: 'section' | 'label' | 'inst' | 'data' | 'directive';
  text: string;
  idx?: number;      // instruction index for 'inst'
  addr?: number;
  line?: number;     // source line for data rows
  sym?: string;
}

export interface GlobalSym {
  name: string;       // display name
  label: string;
  addr: number;
  size: number;
  ty: CType;
  section: '.data' | '.bss' | '.rodata';
  fn?: string;        // owning function for static locals
  line: number;
}

export interface FuncInfo {
  name: string;
  start: number;      // first instruction index
  end: number;        // one past last
  locals: Var[];
  frameSize: number;
  line: number;
  endLine: number;
}

export interface Compiled {
  insts: Inst[];
  listing: ListingRow[];
  funcs: FuncInfo[];
  globals: GlobalSym[];
  strings: { label: string; addr: number; text: string }[];
  sections: { name: string; start: number; size: number }[];
  data: { addr: number; bytes: Uint8Array }[];
  textBase: number;
  textEnd: number;
  rodataBase: number; rodataEnd: number;
  dataBase: number; dataEnd: number;
  bssBase: number; bssEnd: number;
  entry: number;
  addrToIdx: Map<number, number>;
  usedBuiltins: string[];
  lineHasCode: Set<number>;
}

const TEXT_BASE = 0x401000;
const alignUp = (n: number, a: number) => Math.ceil(n / a) * a;
const hex = (n: number) => '0x' + n.toString(16);

const reg = (name: string, size: Size): Opnd => ({ t: 'reg', r: REG_NAMES.indexOf(name as typeof REG_NAMES[number]), size });
const imm = (v: number): Opnd => ({ t: 'imm', v });
const mem = (base: string, disp: number, size: Size): Opnd => ({ t: 'mem', base: REG_NAMES.indexOf(base as typeof REG_NAMES[number]), disp, size });
const ripMem = (sym: string, size: Size): Opnd => ({ t: 'mem', base: -1, sym, disp: 0, size });
const lbl = (name: string): Opnd => ({ t: 'lbl', sym: name });

function fmtOpnd(o: Opnd, withSize: boolean): string {
  switch (o.t) {
    case 'reg': return SUB[REG_NAMES[o.r!]][SIZE_IDX[o.size!]];
    case 'imm': return String(o.v);
    case 'lbl': case 'sym': return o.sym!;
    case 'mem': {
      const sz = withSize ? `${PTR_WORD[o.size!]} PTR ` : '';
      if (o.base === -1) return `${sz}${o.sym}${o.disp ? (o.disp > 0 ? '+' : '') + o.disp : ''}[rip]`;
      const d = o.disp ? (o.disp > 0 ? `+${o.disp}` : `${o.disp}`) : '';
      return `${sz}[${REG_NAMES[o.base!]}${d}]`;
    }
  }
}

function fmtInst(i: Inst): string {
  const noSize = i.op === 'lea';
  const args = [i.a, i.b, i.c].filter(Boolean).map((o) => fmtOpnd(o!, !noSize));
  return args.length ? `${i.op.padEnd(6)} ${args.join(', ')}` : i.op;
}

function instSize(op: string, a?: Opnd, b?: Opnd): number {
  if (['push', 'pop', 'ret', 'leave', 'cdq', 'cqo', 'nop'].includes(op)) return 1;
  if (op === 'call' || op === 'jmp') return 5;
  if (op.startsWith('j')) return 2;
  if (op.startsWith('rep')) return 2;
  let n = 3;
  if (a?.t === 'mem' || b?.t === 'mem') n += 1;
  const m = a?.t === 'mem' ? a : b?.t === 'mem' ? b : undefined;
  if (m && m.base === -1) n += 3;
  if (b?.t === 'imm') n += Math.abs(b.v!) > 127 ? 4 : 1;
  if (a?.size === 8 || b?.size === 8) n += 1;
  return Math.min(n, 10);
}

// ---------- code generator ----------

export function generate(prog: Program): Compiled {
  const insts: Inst[] = [];
  const labels = new Map<string, number>();
  const listing: ListingRow[] = [];
  let line = 0;
  let stmtPending = false;
  let curFn = '_start';
  let labelSeq = 0;
  let retLabel = '';
  const breakStack: string[] = [];
  const contStack: string[] = [];
  const lineHasCode = new Set<number>();

  const strLabel = (i: number) => `.LC${i}`;

  function emit(op: string, a?: Opnd, b?: Opnd, c?: Opnd) {
    const ins: Inst = { op, a, b, c, line, stmt: stmtPending, fn: curFn, addr: 0, size: instSize(op, a, b), text: '' };
    ins.text = fmtInst(ins);
    stmtPending = false;
    insts.push(ins);
    listing.push({ kind: 'inst', text: ins.text, idx: insts.length - 1 });
    if (line > 0) lineHasCode.add(line);
  }
  function label(name: string) {
    const lastRow = listing[listing.length - 1];
    const last = insts[insts.length - 1];
    if (lastRow?.kind === 'inst' && last && last.op === 'jmp' && last.a?.sym === name && lastRow.idx === insts.length - 1) {
      insts.pop();
      listing.pop();
      if (last.stmt) stmtPending = true;   // keep the statement boundary on the next instruction
    }
    labels.set(name, insts.length);
    listing.push({ kind: 'label', text: name + ':' });
  }
  const newLabel = () => `.L${++labelSeq}`;
  const mark = (ln: number) => { line = ln; stmtPending = true; };
  const fail = (msg: string, ln: number): never => { throw new CompileError(msg, ln, 1); };

  const decay = (t: CType): CType => (t.k === 'array' ? { k: 'ptr', to: t.of } : t);
  /** register width (4 or 8) that holds a value of this type */
  const rsz = (t: CType): Size => {
    const d = decay(t);
    return d.k === 'long' || d.k === 'ptr' ? 8 : 4;
  };
  const RAX = (t: CType) => reg('rax', rsz(t));
  const RCX = (t: CType) => reg('rcx', rsz(t));

  // ----- conversions -----
  function cast(from: CType, to: CType, r = 'rax') {
    from = decay(from);
    if (to.k === 'void' || from.k === 'void') return;
    if (to.k === 'char' || to.k === 'short') {
      if (from.k === to.k && (from as { uns: boolean }).uns === to.uns) return;
      const sz: Size = to.k === 'char' ? 1 : 2;
      emit(to.uns ? 'movzx' : 'movsx', reg(r, 4), reg(r, sz));
      return;
    }
    const fs = rsz(from), ts = rsz(to);
    if (ts === 8 && fs === 4) {
      if (isUnsigned(from)) emit('mov', reg(r, 4), reg(r, 4));
      else emit('movsxd', reg(r, 8), reg(r, 4));
    }
  }

  /** Is this a plain scalar variable we can load straight into a register? */
  const simpleVar = (e: Expr) => e.kind === 'var' && e.ty.k !== 'array' && e.ty.k !== 'struct';
  function loadVarInto(e: Expr, r: string) {
    const o = varOpnd(e.v!);
    const ty = e.ty;
    if (ty.k === 'char' || ty.k === 'short') emit((ty as { uns: boolean }).uns ? 'movzx' : 'movsx', reg(r, 4), { ...o, size: ty.k === 'char' ? 1 : 2 });
    else if (ty.k === 'int') emit('mov', reg(r, 4), { ...o, size: 4 });
    else emit('mov', reg(r, 8), { ...o, size: 8 });
  }
  /** Evaluate b into rcx (converted to ty), preserving rax. */
  function rhsIntoRcx(b: Expr, ty: CType) {
    if (simpleVar(b)) { loadVarInto(b, 'rcx'); cast(b.ty, ty, 'rcx'); return; }
    emit('push', reg('rax', 8));
    genExpr(b); cast(b.ty, ty);
    emit('mov', reg('rcx', 8), reg('rax', 8));
    emit('pop', reg('rax', 8));
  }

  // ----- loads and stores -----
  function load(ty: CType, src: Opnd) {
    // src is a memory operand of unspecified size; loads value into rax
    switch (ty.k) {
      case 'array': case 'struct': return;
      case 'char': emit(ty.uns ? 'movzx' : 'movsx', reg('rax', 4), { ...src, size: 1 }); return;
      case 'short': emit(ty.uns ? 'movzx' : 'movsx', reg('rax', 4), { ...src, size: 2 }); return;
      case 'int': emit('mov', reg('rax', 4), { ...src, size: 4 }); return;
      default: emit('mov', reg('rax', 8), { ...src, size: 8 });
    }
  }
  function store(ty: CType, dst: Opnd, from = 'rax') {
    const s = sizeOf(ty) as Size;
    emit('mov', { ...dst, size: s }, reg(from, s));
  }

  // ----- addresses -----
  function varOpnd(v: Var): Opnd {
    return v.global ? ripMem(v.label, 8) : mem('rbp', -v.offset, 8);
  }
  function genAddr(e: Expr) {
    switch (e.kind) {
      case 'var':
        emit('lea', reg('rax', 8), varOpnd(e.v!));
        return;
      case 'deref':
        genExpr(e.a!);
        return;
      case 'member':
        if (e.a!.kind === 'var') {
          const v = e.a!.v!;
          const o = varOpnd(v);
          emit('lea', reg('rax', 8), { ...o, disp: (o.disp ?? 0) + e.mem!.offset });
          return;
        }
        genAddr(e.a!);
        if (e.mem!.offset) emit('add', reg('rax', 8), imm(e.mem!.offset));
        return;
      case 'str':
        emit('lea', reg('rax', 8), ripMem(strLabel(e.str!), 8));
        return;
    }
    fail('expression is not an lvalue', e.line);
  }

  /** A memory operand for an lvalue: direct for variables/members of variables, else via rdi. */
  function lvalOpnd(e: Expr): Opnd {
    if (e.kind === 'var') return varOpnd(e.v!);
    if (e.kind === 'member' && e.a!.kind === 'var') {
      const o = varOpnd(e.a!.v!);
      return { ...o, disp: (o.disp ?? 0) + e.mem!.offset };
    }
    genAddr(e);
    emit('mov', reg('rdi', 8), reg('rax', 8));
    return mem('rdi', 0, 8);
  }

  // ----- expressions -----
  function genCond(e: Expr, falseLabel: string) {
    if (e.kind === 'binop' && e.op! in INVERT) {
      if (e.line) line = e.line;
      const ct = cmpType(e.a!, e.b!);
      emitCompare(e.a!, e.b!, ct);
      emit(JCC[INVERT[e.op!]][isUnsigned(ct) ? 1 : 0], lbl(falseLabel));
      return;
    }
    if (e.kind === 'logand') { genCond(e.a!, falseLabel); genCond(e.b!, falseLabel); return; }
    if (e.kind === 'logor') {
      const ok = newLabel(), next = newLabel();
      genCond(e.a!, next);
      emit('jmp', lbl(ok));
      label(next);
      genCond(e.b!, falseLabel);
      label(ok);
      return;
    }
    genExpr(e);
    emit('cmp', RAX(e.ty), imm(0));
    emit('je', lbl(falseLabel));
  }

  /** Constant value of a number literal, possibly wrapped in casts (e.g. NULL is ((void*)0)). */
  const numVal = (e: Expr): number | null => (e.kind === 'num' ? e.val! : e.kind === 'cast' && e.ty.k !== 'char' && e.ty.k !== 'short' ? numVal(e.a!) : null);
  const isNum = (e: Expr) => { const v = numVal(e); return v !== null && Math.abs(v) < 2 ** 31; };

  function arith(op: string, ty: CType) {
    // rax = left, rcx = right (both already converted to ty)
    const A = RAX(ty), C = RCX(ty);
    const uns = isUnsigned(ty);
    switch (op) {
      case '+': emit('add', A, C); break;
      case '-': emit('sub', A, C); break;
      case '*': emit('imul', A, C); break;
      case '/': case '%':
        if (uns) emit('xor', reg('rdx', 4), reg('rdx', 4));
        else emit(rsz(ty) === 8 ? 'cqo' : 'cdq');
        emit(uns ? 'div' : 'idiv', C);
        if (op === '%') emit('mov', A, reg('rdx', rsz(ty)));
        break;
      case '&': emit('and', A, C); break;
      case '|': emit('or', A, C); break;
      case '^': emit('xor', A, C); break;
      case '<<': emit('sal', A, reg('rcx', 1)); break;
      case '>>': emit(uns ? 'shr' : 'sar', A, reg('rcx', 1)); break;
      default: fail(`internal: unknown operator ${op}`, line);
    }
  }

  const SETCC: Record<string, [string, string]> = {
    '==': ['sete', 'sete'], '!=': ['setne', 'setne'], '<': ['setl', 'setb'], '<=': ['setle', 'setbe'],
    '>': ['setg', 'seta'], '>=': ['setge', 'setae'],
  };

  function genBinop(e: Expr) {
    const a = e.a!, b = e.b!, op = e.op!;
    if (op === 'ptrdiff') {
      genExpr(a); emit('push', reg('rax', 8));
      genExpr(b); emit('mov', reg('rcx', 8), reg('rax', 8));
      emit('pop', reg('rax', 8));
      emit('sub', reg('rax', 8), reg('rcx', 8));
      const sz = sizeOf(baseOf(decay(a.ty))!);
      if (sz > 1) {
        if ((sz & (sz - 1)) === 0) emit('sar', reg('rax', 8), imm(Math.log2(sz)));
        else { emit('mov', reg('rcx', 8), imm(sz)); emit('cqo'); emit('idiv', reg('rcx', 8)); }
      }
      return;
    }
    if ((op === '+' || op === '-') && e.ty.k === 'ptr') {
      const sz = sizeOf(baseOf(decay(e.ty))!);
      genExpr(a);
      if (isNum(b) && Math.abs(numVal(b)! * sz) < 2 ** 31) {
        if (numVal(b)! !== 0) emit(op === '+' ? 'add' : 'sub', reg('rax', 8), imm(numVal(b)! * sz));
        return;
      }
      emit('push', reg('rax', 8));
      genExpr(b); cast(b.ty, LONG);
      if (sz !== 1) emit('imul', reg('rax', 8), reg('rax', 8), imm(sz));
      emit('mov', reg('rcx', 8), reg('rax', 8));
      emit('pop', reg('rax', 8));
      emit(op === '+' ? 'add' : 'sub', reg('rax', 8), reg('rcx', 8));
      return;
    }
    if (op in SETCC) {
      const ct = cmpType(a, b);
      emitCompare(a, b, ct);
      emit(SETCC[op][isUnsigned(ct) ? 1 : 0], reg('rax', 1));
      emit('movzx', reg('rax', 4), reg('rax', 1));
      return;
    }
    // arithmetic on integers
    const ty = e.ty;
    genExpr(a); cast(a.ty, ty);
    const simple = ['+', '-', '&', '|', '^'];
    if (isNum(b) && simple.includes(op)) {
      emit({ '+': 'add', '-': 'sub', '&': 'and', '|': 'or', '^': 'xor' }[op]!, RAX(ty), imm(numVal(b)!));
      return;
    }
    if (isNum(b) && op === '*') { emit('imul', RAX(ty), RAX(ty), imm(numVal(b)!)); return; }
    if (isNum(b) && (op === '<<' || op === '>>')) {
      emit(op === '<<' ? 'sal' : isUnsigned(ty) ? 'shr' : 'sar', RAX(ty), imm(numVal(b)! & (rsz(ty) * 8 - 1)));
      return;
    }
    rhsIntoRcx(b, op === '<<' || op === '>>' ? INT : ty);
    arith(op, ty);
  }

  function cmpType(a: Expr, b: Expr): CType {
    const at = decay(a.ty), bt = decay(b.ty);
    if (!(isInteger(at) && isInteger(bt))) return { k: 'long', uns: true };
    const pa = promote(at), pb = promote(bt);
    const long = pa.k === 'long' || pb.k === 'long';
    const uA = (pa as { uns: boolean }).uns && (long ? pa.k === 'long' : true);
    const uB = (pb as { uns: boolean }).uns && (long ? pb.k === 'long' : true);
    return { k: long ? 'long' : 'int', uns: uA || uB } as CType;
  }
  function emitCompare(a: Expr, b: Expr, ct: CType) {
    genExpr(a); cast(a.ty, ct);
    if (isNum(b)) emit('cmp', RAX(ct), imm(numVal(b)!));
    else { rhsIntoRcx(b, ct); emit('cmp', RAX(ct), RCX(ct)); }
  }
  const JCC: Record<string, [string, string]> = {
    '==': ['je', 'je'], '!=': ['jne', 'jne'], '<': ['jl', 'jb'], '<=': ['jle', 'jbe'], '>': ['jg', 'ja'], '>=': ['jge', 'jae'],
  };
  const INVERT: Record<string, string> = { '==': '!=', '!=': '==', '<': '>=', '<=': '>', '>': '<=', '>=': '<' };

  function genCall(e: Expr) {
    const args = e.args!;
    const fty = e.fnTy as CType & { k: 'func' };
    const conv = (a: Expr, i: number) => {
      genExpr(a);
      if (i < fty.params.length) cast(a.ty, fty.params[i]);
      else cast(a.ty, promote(decay(a.ty)));
    };
    const nStack = Math.max(0, args.length - 6);
    for (let i = args.length - 1; i >= 6; i--) { conv(args[i], i); emit('push', reg('rax', 8)); }
    const nReg = Math.min(args.length, 6);
    if (nReg === 1) {
      conv(args[0], 0);
      const w = rsz(0 < fty.params.length ? fty.params[0] : promote(decay(args[0].ty)));
      emit('mov', reg(ARG_REGS[0], w), reg('rax', w));
    } else {
      for (let i = 0; i < nReg; i++) { conv(args[i], i); emit('push', reg('rax', 8)); }
      for (let i = nReg - 1; i >= 0; i--) emit('pop', reg(ARG_REGS[i], 8));
    }
    if (fty.variadic) emit('mov', reg('rax', 4), imm(0));
    emit('call', { t: e.builtin ? 'sym' : 'lbl', sym: e.name! });
    if (nStack) emit('add', reg('rsp', 8), imm(nStack * 8));
  }

  function genExpr(e: Expr): void {
    if (e.line) line = e.line;
    switch (e.kind) {
      case 'num':
        if (rsz(e.ty) === 8 && (e.val! >= 2 ** 31 || e.val! < -(2 ** 31))) emit('movabs', reg('rax', 8), imm(e.val!));
        else emit('mov', RAX(e.ty), imm(e.val!));
        return;
      case 'str':
        emit('lea', reg('rax', 8), ripMem(strLabel(e.str!), 8));
        return;
      case 'var':
        if (e.ty.k === 'array' || e.ty.k === 'struct') { genAddr(e); return; }
        load(e.ty, varOpnd(e.v!));
        return;
      case 'member': case 'deref':
        if (e.kind === 'member' && e.a!.kind === 'var' && e.ty.k !== 'array' && e.ty.k !== 'struct') {
          load(e.ty, lvalOpnd(e));
          return;
        }
        genAddr(e);
        load(e.ty, mem('rax', 0, 8));
        return;
      case 'addr':
        genAddr(e.a!);
        return;
      case 'neg':
        genExpr(e.a!); cast(e.a!.ty, e.ty); emit('neg', RAX(e.ty));
        return;
      case 'bitnot':
        genExpr(e.a!); cast(e.a!.ty, e.ty); emit('not', RAX(e.ty));
        return;
      case 'not':
        genExpr(e.a!);
        emit('cmp', RAX(e.a!.ty), imm(0));
        emit('sete', reg('rax', 1));
        emit('movzx', reg('rax', 4), reg('rax', 1));
        return;
      case 'cast':
        genExpr(e.a!); cast(e.a!.ty, e.ty);
        return;
      case 'binop':
        genBinop(e);
        return;
      case 'comma':
        genExpr(e.a!); genExpr(e.b!);
        return;
      case 'logand': case 'logor': {
        const out = newLabel(), end = newLabel();
        const isAnd = e.kind === 'logand';
        genExpr(e.a!); emit('cmp', RAX(e.a!.ty), imm(0)); emit(isAnd ? 'je' : 'jne', lbl(out));
        genExpr(e.b!); emit('cmp', RAX(e.b!.ty), imm(0)); emit(isAnd ? 'je' : 'jne', lbl(out));
        emit('mov', reg('rax', 4), imm(isAnd ? 1 : 0)); emit('jmp', lbl(end));
        label(out); emit('mov', reg('rax', 4), imm(isAnd ? 0 : 1));
        label(end);
        return;
      }
      case 'cond': {
        const els = newLabel(), end = newLabel();
        genCond(e.a!, els);
        genExpr(e.b!); cast(e.b!.ty, e.ty); emit('jmp', lbl(end));
        label(els); genExpr(e.c!); cast(e.c!.ty, e.ty);
        label(end);
        return;
      }
      case 'assign': {
        const a = e.a!, b = e.b!;
        if (a.ty.k === 'struct') {
          genAddr(a); emit('push', reg('rax', 8));
          genAddr(b); emit('mov', reg('rsi', 8), reg('rax', 8));
          emit('pop', reg('rdi', 8));
          emit('mov', reg('rcx', 4), imm(sizeOf(a.ty)));
          emit('rep movsb');
          return;
        }
        if (a.kind === 'var' || (a.kind === 'member' && a.a!.kind === 'var')) {
          genExpr(b); cast(b.ty, a.ty);
          store(a.ty, lvalOpnd(a));
          return;
        }
        genAddr(a); emit('push', reg('rax', 8));
        genExpr(b); cast(b.ty, a.ty);
        emit('pop', reg('rdi', 8));
        store(a.ty, mem('rdi', 0, 8));
        return;
      }
      case 'opassign': {
        const a = e.a!, b = e.b!, shape = e.c!;
        const direct = a.kind === 'var' || (a.kind === 'member' && a.a!.kind === 'var');
        let dst: Opnd;
        if (direct) dst = lvalOpnd(a);
        else { genAddr(a); emit('push', reg('rax', 8)); dst = mem('rax', 0, 8); }
        load(a.ty, dst);
        if (shape.ty.k === 'ptr') {
          const sz = sizeOf(baseOf(shape.ty)!);
          emit('push', reg('rax', 8));
          genExpr(b); cast(b.ty, LONG);
          if (sz !== 1) emit('imul', reg('rax', 8), reg('rax', 8), imm(sz));
          emit('mov', reg('rcx', 8), reg('rax', 8));
          emit('pop', reg('rax', 8));
          emit(e.op === '+' ? 'add' : 'sub', reg('rax', 8), reg('rcx', 8));
        } else {
          const ty = shape.ty;
          cast(a.ty, ty);
          emit('push', reg('rax', 8));
          genExpr(b); cast(b.ty, e.op === '<<' || e.op === '>>' ? INT : ty);
          emit('mov', reg('rcx', 8), reg('rax', 8));
          emit('pop', reg('rax', 8));
          arith(e.op!, ty);
          cast(ty, a.ty);
        }
        if (!direct) { emit('pop', reg('rdi', 8)); dst = mem('rdi', 0, 8); }
        store(a.ty, dst);
        return;
      }
      case 'incdec': {
        const a = e.a!;
        const dst = lvalOpnd(a);
        load(a.ty, dst);
        const step = a.ty.k === 'ptr' ? sizeOf(a.ty.to) : 1;
        const w = rsz(a.ty);
        emit('mov', reg('rdx', w), reg('rax', w));
        emit(e.op === '++' ? 'add' : 'sub', reg('rdx', w), imm(step));
        store(a.ty, dst, 'rdx');
        if (e.prefix) {
          emit('mov', reg('rax', w), reg('rdx', w));
          if (a.ty.k === 'char' || a.ty.k === 'short') cast(INT, a.ty);   // wrap like the stored value
        }
        return;
      }
      case 'call':
        genCall(e);
        return;
    }
    fail(`internal: cannot generate ${e.kind}`, e.line);
  }

  // ----- initializers -----
  interface Leaf { off: number; ty: CType; expr?: Expr; bytes?: string; line: number }
  function flatten(ty: CType, init: Init, base: number, out: Leaf[]) {
    if (ty.k === 'array') {
      const elem = ty.of;
      if (init.expr) {
        const ex = init.expr;
        if (ex.kind === 'str' && (elem.k === 'char')) {
          const s = prog.strings[ex.str!];
          if (s.length > ty.len) fail(`initializer-string for array of ${ty.len} chars is too long`, init.line);
          out.push({ off: base, ty, bytes: s.length < ty.len ? s + '\0' : s, line: init.line });
          return;
        }
        fail(`invalid initializer for array of type '${typeName(ty)}'`, init.line);
      }
      let i = 0;
      for (const it of init.list!) {
        i = it.index ?? i;
        if (i >= ty.len) fail('excess elements in array initializer', it.init.line);
        flatten(elem, it.init, base + i * sizeOf(elem), out);
        i++;
      }
      return;
    }
    if (ty.k === 'struct') {
      if (!init.list) fail('initializing a struct from an expression is not supported here; assign it after declaring', init.line);
      let mi = 0;
      for (const it of init.list!) {
        if (it.field) {
          mi = ty.members.findIndex((m) => m.name === it.field);
          if (mi < 0) fail(`'${typeName(ty)}' has no member named '${it.field}'`, it.init.line);
        }
        if (mi >= ty.members.length) fail('excess elements in struct initializer', it.init.line);
        const m = ty.members[mi];
        flatten(m.ty, it.init, base + m.offset, out);
        mi++;
      }
      return;
    }
    if (init.list) {
      if (init.list.length === 0) return;
      flatten(ty, init.list[0].init, base, out);
      return;
    }
    out.push({ off: base, ty, expr: init.expr, line: init.line });
  }

  function genLocalInit(v: Var, init: Init) {
    const ty = v.ty;
    if (ty.k !== 'array' && ty.k !== 'struct') {
      const leaves: Leaf[] = [];
      flatten(ty, init, 0, leaves);
      if (!leaves.length) { emit('mov', { ...mem('rbp', -v.offset, 8), size: sizeOf(ty) as Size }, imm(0)); return; }
      genExpr(leaves[0].expr!); cast(leaves[0].expr!.ty, ty);
      store(ty, mem('rbp', -v.offset, 8));
      return;
    }
    const leaves: Leaf[] = [];
    flatten(ty, init, 0, leaves);
    const size = sizeOf(ty);
    const coversAll = leaves.length === 1 && leaves[0].bytes !== undefined && leaves[0].bytes.length === size;
    if (!coversAll) {
      emit('lea', reg('rdi', 8), mem('rbp', -v.offset, 8));
      emit('mov', reg('rcx', 4), imm(size));
      emit('mov', reg('rax', 4), imm(0));
      emit('rep stosb');
    }
    for (const lf of leaves) {
      if (lf.bytes !== undefined) {
        for (let k = 0; k < lf.bytes.length; k++) {
          const c = lf.bytes.charCodeAt(k);
          if (c !== 0 || coversAll) emit('mov', { ...mem('rbp', -v.offset + lf.off + k, 1) }, imm(c > 127 ? c - 256 : c));
        }
        continue;
      }
      line = lf.line;
      genExpr(lf.expr!); cast(lf.expr!.ty, lf.ty);
      store(lf.ty, mem('rbp', -v.offset + lf.off, 8));
    }
  }

  // ----- statements -----
  function genStmt(s: Stmt) {
    switch (s.kind) {
      case 'nop': return;
      case 'block': for (const t of s.body!) genStmt(t); return;
      case 'expr': mark(s.line); genExpr(s.e!); return;
      case 'decl': mark(s.line); genLocalInit(s.v!, s.initz!); return;
      case 'return':
        mark(s.line);
        if (s.e) {
          genExpr(s.e);
          const ret = (prog.funcs.find((f) => f.name === curFn)!.ty).ret;
          cast(s.e.ty, ret);
        }
        emit('jmp', lbl(retLabel));
        return;
      case 'if': {
        const els = newLabel(), end = newLabel();
        mark(s.line);
        genCond(s.cond!, els);
        genStmt(s.then!);
        if (s.els) { emit('jmp', lbl(end)); label(els); genStmt(s.els); label(end); }
        else label(els);
        return;
      }
      case 'while': {
        const begin = newLabel(), end = newLabel();
        breakStack.push(end); contStack.push(begin);
        label(begin);
        mark(s.line);
        genCond(s.cond!, end);
        genStmt(s.s!);
        emit('jmp', lbl(begin));
        label(end);
        breakStack.pop(); contStack.pop();
        return;
      }
      case 'do': {
        const begin = newLabel(), cont = newLabel(), end = newLabel();
        breakStack.push(end); contStack.push(cont);
        label(begin);
        genStmt(s.s!);
        label(cont);
        mark(s.val!);
        genExpr(s.cond!);
        emit('cmp', RAX(s.cond!.ty), imm(0));
        emit('jne', lbl(begin));
        label(end);
        breakStack.pop(); contStack.pop();
        return;
      }
      case 'for': {
        const begin = newLabel(), cont = newLabel(), end = newLabel();
        if (s.init) genStmt(s.init);
        breakStack.push(end); contStack.push(cont);
        label(begin);
        if (s.cond) { mark(s.line); genCond(s.cond, end); }
        genStmt(s.s!);
        label(cont);
        if (s.inc) { mark(s.line); genExpr(s.inc); }
        emit('jmp', lbl(begin));
        label(end);
        breakStack.pop(); contStack.pop();
        return;
      }
      case 'break': mark(s.line); emit('jmp', lbl(breakStack[breakStack.length - 1])); return;
      case 'continue': mark(s.line); emit('jmp', lbl(contStack[contStack.length - 1])); return;
      case 'switch': {
        const end = newLabel();
        mark(s.line);
        genExpr(s.cond!);
        const ct = promote(decay(s.cond!.ty));
        let defLabel = end;
        const seen = new Set<number>();
        for (const c of s.cases!) {
          (c as Stmt & { lbl?: string }).lbl = newLabel();
          if (c.kind === 'case') {
            if (seen.has(c.val!)) fail(`duplicate case value ${c.val}`, c.line);
            seen.add(c.val!);
            emit('cmp', RAX(ct), imm(c.val!));
            emit('je', lbl((c as Stmt & { lbl?: string }).lbl!));
          } else defLabel = (c as Stmt & { lbl?: string }).lbl!;
        }
        emit('jmp', lbl(defLabel));
        breakStack.push(end);
        genStmt(s.s!);
        breakStack.pop();
        label(end);
        return;
      }
      case 'case': case 'default':
        label((s as Stmt & { lbl?: string }).lbl!);
        genStmt(s.s!);
        return;
    }
    fail(`internal: unknown statement ${s.kind}`, s.line);
  }

  // ----- functions -----
  const funcInfos: FuncInfo[] = [];

  // _start: the C runtime entry point (simplified __libc_start_main)
  listing.push({ kind: 'section', text: '.text' });
  listing.push({ kind: 'directive', text: '.globl _start' });
  label('_start');
  curFn = '_start'; line = 0;
  emit('xor', reg('rbp', 4), reg('rbp', 4));
  emit('call', lbl('main'));
  emit('mov', reg('rdi', 4), reg('rax', 4));
  emit('call', { t: 'sym', sym: 'exit' });
  funcInfos.push({ name: '_start', start: 0, end: insts.length, locals: [], frameSize: 0, line: 0, endLine: 0 });

  for (const f of prog.funcs) {
    // frame layout: params first, then locals, each aligned
    let off = 0;
    for (const v of f.locals) {
      const a = alignOf(v.ty);
      off = alignUp(off + sizeOf(v.ty), a);
      v.offset = off;
    }
    f.frameSize = alignUp(off, 16);

    curFn = f.name;
    retLabel = `.Lreturn_${f.name}`;
    listing.push({ kind: 'directive', text: `.globl ${f.name}` });
    const start = insts.length;
    label(f.name);
    line = f.line;          // the prologue belongs to the function's line but is not a stop point
    stmtPending = false;
    emit('push', reg('rbp', 8));
    emit('mov', reg('rbp', 8), reg('rsp', 8));
    if (f.frameSize) emit('sub', reg('rsp', 8), imm(f.frameSize));
    f.params.forEach((pv, i) => {
      const sz = sizeOf(pv.ty) as Size;
      if (i < 6) emit('mov', mem('rbp', -pv.offset, sz), reg(ARG_REGS[i], sz));
      else {
        emit('mov', reg('rax', 8), mem('rbp', 16 + 8 * (i - 6), 8));
        emit('mov', mem('rbp', -pv.offset, sz), reg('rax', sz));
      }
    });
    genStmt(f.body);
    mark(f.endLine);
    if (f.name === 'main') emit('mov', reg('rax', 4), imm(0));
    label(retLabel);
    if (f.frameSize) emit('leave');
    else emit('pop', reg('rbp', 8));
    emit('ret');
    funcInfos.push({ name: f.name, start, end: insts.length, locals: f.locals, frameSize: f.frameSize, line: f.line, endLine: f.endLine });
  }

  // ---------- layout ----------
  let addr = TEXT_BASE;
  for (const ins of insts) { ins.addr = addr; addr += ins.size; }
  const textEnd = addr;
  const addrToIdx = new Map<number, number>();
  insts.forEach((ins, i) => addrToIdx.set(ins.addr, i));

  // .rodata: string literals
  const rodataBase = alignUp(textEnd, 0x1000);
  let ro = rodataBase;
  const strings = prog.strings.map((text, i) => {
    const s = { label: strLabel(i), addr: ro, text };
    ro += text.length + 1;
    return s;
  });
  const rodataEnd = ro;

  // .data / .bss
  const dataBase = alignUp(rodataEnd, 0x1000) + 0x1000;
  const symAddr = new Map<string, number>();
  strings.forEach((s) => symAddr.set(s.label, s.addr));
  let dp = dataBase;
  const initialized = prog.globals.filter((g) => g.init);
  const zeroed = prog.globals.filter((g) => !g.init);
  const globals: GlobalSym[] = [];
  for (const g of initialized) {
    dp = alignUp(dp, Math.max(alignOf(g.ty), sizeOf(g.ty) >= 16 ? 16 : 1));
    symAddr.set(g.label, dp);
    globals.push({ name: g.name, label: g.label, addr: dp, size: sizeOf(g.ty), ty: g.ty, section: '.data', fn: g.isStatic ? g.fn : undefined, line: g.line });
    dp += sizeOf(g.ty);
  }
  const dataEnd = dp;
  let bp = alignUp(dataEnd, 32);
  const bssBase = bp;
  for (const g of zeroed) {
    bp = alignUp(bp, Math.max(alignOf(g.ty), sizeOf(g.ty) >= 16 ? 16 : 1));
    symAddr.set(g.label, bp);
    globals.push({ name: g.name, label: g.label, addr: bp, size: sizeOf(g.ty), ty: g.ty, section: '.bss', fn: g.isStatic ? g.fn : undefined, line: g.line });
    bp += sizeOf(g.ty);
  }
  const bssEnd = Math.max(bp, bssBase);

  // resolve symbols in instructions
  for (const ins of insts) {
    for (const o of [ins.a, ins.b, ins.c]) {
      if (!o) continue;
      if (o.t === 'mem' && o.base === -1) {
        const a = symAddr.get(o.sym!);
        if (a === undefined) fail(`internal: unknown symbol ${o.sym}`, ins.line);
        o.abs = a! + (o.disp ?? 0);
      } else if (o.t === 'lbl') {
        const t = labels.get(o.sym!);
        if (t === undefined) {
          if (o.sym && !o.sym.startsWith('.')) fail(`undefined reference to '${o.sym}' (it is declared but never defined)`, ins.line);
          fail(`internal: unknown label ${o.sym}`, ins.line);
        }
        o.target = t;
      } else if (o.t === 'sym' && !BUILTINS[o.sym!] && o.sym !== 'exit') {
        fail(`internal: unknown builtin ${o.sym}`, ins.line);
      }
    }
  }

  // global initial bytes
  const data: { addr: number; bytes: Uint8Array }[] = [];
  const dataRows: ListingRow[] = [];
  function evalReloc(e: Expr): { sym?: string; val: number } {
    switch (e.kind) {
      case 'num': return { val: e.val! };
      case 'cast': return evalReloc(e.a!);
      case 'neg': { const r = evalReloc(e.a!); if (r.sym) break; return { val: -r.val }; }
      case 'bitnot': { const r = evalReloc(e.a!); if (r.sym) break; return { val: ~r.val }; }
      case 'str': return { sym: strLabel(e.str!), val: 0 };
      case 'addr': {
        const a = e.a!;
        if (a.kind === 'var' && a.v!.global) return { sym: a.v!.label, val: 0 };
        if (a.kind === 'str') return { sym: strLabel(a.str!), val: 0 };
        if (a.kind === 'member') { const r = evalReloc({ ...a, kind: 'addr', a: a.a } as Expr); return { sym: r.sym, val: r.val + a.mem!.offset }; }
        if (a.kind === 'deref') return evalReloc(a.a!);
        break;
      }
      case 'var':
        if (e.v!.global && e.ty.k === 'array') return { sym: e.v!.label, val: 0 };
        break;
      case 'binop': {
        const l = evalReloc(e.a!), r = evalReloc(e.b!);
        const scale = e.ty.k === 'ptr' ? sizeOf(baseOf(e.ty)!) : 1;
        if (!r.sym && (e.op === '+' || e.op === '-')) return { sym: l.sym, val: e.op === '+' ? l.val + r.val * scale : l.val - r.val * scale };
        if (!l.sym && !r.sym) {
          const a = l.val, b = r.val;
          const v = { '*': a * b, '/': Math.trunc(a / b), '%': a % b, '<<': a * 2 ** b, '>>': Math.floor(a / 2 ** b), '&': a & b, '|': a | b, '^': a ^ b }[e.op!];
          if (v !== undefined) return { val: v };
        }
        break;
      }
    }
    return fail('initializer element is not a compile-time constant', e.line);
  }
  const writeLE = (buf: Uint8Array, off: number, size: number, v: number) => {
    let hi = Math.floor(v / 4294967296);
    let lo = v - hi * 4294967296;
    for (let k = 0; k < size; k++) {
      buf[off + k] = k < 4 ? (lo >>> (8 * k)) & 0xff : (hi >>> (8 * (k - 4))) & 0xff;
    }
  };
  const directiveFor = (size: number) => ({ 1: '.byte', 2: '.value', 4: '.long', 8: '.quad' } as Record<number, string>)[size];

  dataRows.push({ kind: 'section', text: '.section .rodata' });
  for (const s of strings) {
    dataRows.push({ kind: 'label', text: s.label + ':', addr: s.addr, sym: s.label });
    dataRows.push({ kind: 'data', text: `.string ${JSON.stringify(s.text)}`, addr: s.addr, sym: s.label });
  }
  if (initialized.length) dataRows.push({ kind: 'section', text: '.data' });
  for (const g of initialized) {
    const ga = symAddr.get(g.label)!;
    const bytes = new Uint8Array(sizeOf(g.ty));
    const leaves: Leaf[] = [];
    flatten(g.ty, g.init!, 0, leaves);
    dataRows.push({ kind: 'directive', text: `.globl ${g.label}`, line: g.line });
    dataRows.push({ kind: 'label', text: g.label + ':', addr: ga, line: g.line, sym: g.label });
    let cursor = 0;
    leaves.sort((a, b) => a.off - b.off);
    for (const lf of leaves) {
      if (lf.off > cursor) dataRows.push({ kind: 'data', text: `.zero ${lf.off - cursor}`, line: g.line });
      if (lf.bytes !== undefined) {
        for (let k = 0; k < lf.bytes.length; k++) bytes[lf.off + k] = lf.bytes.charCodeAt(k);
        dataRows.push({ kind: 'data', text: `.string ${JSON.stringify(lf.bytes.replace(/\0$/, ''))}`, line: g.line });
        cursor = lf.off + lf.bytes.length;
        continue;
      }
      const r = evalReloc(lf.expr!);
      const sz = sizeOf(lf.ty);
      const val = r.sym ? symAddr.get(r.sym)! + r.val : r.val;
      writeLE(bytes, lf.off, sz, val);
      dataRows.push({ kind: 'data', text: `${directiveFor(sz)} ${r.sym ? r.sym + (r.val ? '+' + r.val : '') : r.val}`, line: g.line });
      cursor = lf.off + sz;
    }
    if (cursor < bytes.length) dataRows.push({ kind: 'data', text: `.zero ${bytes.length - cursor}`, line: g.line });
    data.push({ addr: ga, bytes });
  }
  if (zeroed.length) dataRows.push({ kind: 'section', text: '.bss' });
  for (const g of zeroed) {
    const ga = symAddr.get(g.label)!;
    dataRows.push({ kind: 'label', text: g.label + ':', addr: ga, line: g.line, sym: g.label });
    dataRows.push({ kind: 'data', text: `.zero ${sizeOf(g.ty)}`, line: g.line });
  }
  for (const s of strings) data.push({ addr: s.addr, bytes: Uint8Array.from([...s.text].map((c) => c.charCodeAt(0) & 0xff).concat([0])) });

  for (const row of listing) if (row.kind === 'inst') row.addr = insts[row.idx!].addr;

  return {
    insts,
    listing: [...listing, ...dataRows],
    funcs: funcInfos,
    globals,
    strings,
    sections: [
      { name: '.text', start: TEXT_BASE, size: textEnd - TEXT_BASE },
      { name: '.rodata', start: rodataBase, size: rodataEnd - rodataBase },
      { name: '.data', start: dataBase, size: dataEnd - dataBase },
      { name: '.bss', start: bssBase, size: bssEnd - bssBase },
    ],
    data,
    textBase: TEXT_BASE,
    textEnd,
    rodataBase, rodataEnd,
    dataBase, dataEnd,
    bssBase, bssEnd,
    entry: 0,
    addrToIdx,
    usedBuiltins: [...prog.usedBuiltins],
    lineHasCode,
  };
}

export { hex };
