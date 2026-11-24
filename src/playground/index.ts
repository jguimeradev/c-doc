// Public entry point of the in-browser C toolchain.

import { tokenize, CompileError } from './lexer.ts';
import { parse } from './parser.ts';
import { generate, type Compiled } from './codegen.ts';

export { Machine, Fault, hex, STACK_TOP, REG } from './vm.ts';
export type { StopReason, RunMode, Frame, ValueView, HeapBlock } from './vm.ts';
export type { Compiled, Inst, ListingRow, FuncInfo, GlobalSym } from './codegen.ts';
export { REG_NAMES } from './codegen.ts';
export { CompileError };

export type CompileResult =
  | { ok: true; program: Compiled; warnings: string[] }
  | { ok: false; error: { message: string; line: number; col: number } };

export function compile(src: string): CompileResult {
  try {
    const { tokens } = tokenize(src);
    const ast = parse(tokens, src);
    const program = generate(ast);
    return { ok: true, program, warnings: [] };
  } catch (e) {
    if (e instanceof CompileError) return { ok: false, error: { message: e.message, line: e.line, col: e.col } };
    return { ok: false, error: { message: `internal compiler error: ${(e as Error).message}`, line: 1, col: 1 } };
  }
}
