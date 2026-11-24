// A simulated x86-64 Linux process: registers, segmented memory, a malloc heap with
// AddressSanitizer-style checks, and a small libc.

import type { Compiled, Inst, Opnd, FuncInfo, GlobalSym } from './codegen.ts';
import { REG_NAMES } from './codegen.ts';
import { type CType, sizeOf, typeName } from './types.ts';
import type { Var } from './parser.ts';

const TWO32 = 4294967296;
const TWO64 = 18446744073709551616;
export const STACK_TOP = 0x7ffffffff000;
const STACK_SIZE = 1 << 20;            // 1 MiB (Linux default is 8 MiB)
const HEAP_LIMIT = 16 << 20;           // malloc fails beyond 16 MiB
const OUTPUT_LIMIT = 200_000;
const R = Object.fromEntries(REG_NAMES.map((n, i) => [n, i])) as Record<typeof REG_NAMES[number], number>;
const ARG_REGS = [R.rdi, R.rsi, R.rdx, R.rcx, R.r8, R.r9];

const low32 = (v: number) => { const r = v % TWO32; return r < 0 ? r + TWO32 : r; };
const norm64 = (v: number) => (v >= 2 ** 63 ? v - TWO64 : v < -(2 ** 63) ? v + TWO64 : v);
export function sx(v: number, size: number): number {
  switch (size) {
    case 1: return (low32(v) << 24) >> 24;
    case 2: return (low32(v) << 16) >> 16;
    case 4: return low32(v) | 0;
    default: return v;
  }
}
export function ux(v: number, size: number): number {
  switch (size) {
    case 1: return low32(v) & 0xff;
    case 2: return low32(v) & 0xffff;
    case 4: return low32(v);
    default: return v < 0 ? v + TWO64 : v;
  }
}
const big = (v: number) => BigInt.asIntN(64, BigInt(Math.trunc(v)));
const fromBig = (b: bigint) => Number(BigInt.asIntN(64, b));
export const hex = (n: number) => '0x' + (n < 0 ? (n + TWO64) : n).toString(16);

export class Fault extends Error {
  signal: string;
  title: string;
  addr?: number;
  constructor(signal: string, title: string, message: string, addr?: number) {
    super(message);
    this.signal = signal;
    this.title = title;
    this.addr = addr;
  }
}
class Exit { code: number; constructor(code: number) { this.code = code; } }

// ---------- memory ----------

export interface Segment {
  name: string;
  start: number;
  end: number;          // current end (exclusive) of mapped bytes
  bytes: Uint8Array;
  view: DataView;
  writable: boolean;
  perms: string;
}

export interface HeapBlock {
  id: number;
  addr: number;
  size: number;
  freed: boolean;
  allocLine: number;
  freeLine?: number;
}

export class Memory {
  segs: Segment[] = [];
  heap!: Segment;
  stack!: Segment;
  blocks: HeapBlock[] = [];
  sanitizer = true;
  curLine = () => 0;

  add(name: string, start: number, size: number, writable: boolean, perms: string): Segment {
    const bytes = new Uint8Array(size);
    const s: Segment = { name, start, end: start + size, bytes, view: new DataView(bytes.buffer), writable, perms };
    this.segs.push(s);
    return s;
  }

  find(addr: number): Segment | null {
    for (const s of this.segs) if (addr >= s.start && addr < s.end) return s;
    return null;
  }

  private seg(addr: number, size: number, write: boolean): Segment {
    const s = this.find(addr);
    if (!s || addr + size > s.end) {
      if (addr >= this.stack.start - 65536 && addr < this.stack.start) {
        throw new Fault('SIGSEGV', 'Stack overflow', `Access at ${hex(addr)} is below the bottom of the stack (${STACK_SIZE / 1024} KiB). Usually this means infinite or very deep recursion.`, addr);
      }
      if (addr >= 0 && addr < 4096) {
        throw new Fault('SIGSEGV', 'Segmentation fault', `${write ? 'Write to' : 'Read from'} address ${hex(addr)}: this is a NULL pointer dereference${addr ? ` (NULL + ${addr})` : ''}.`, addr);
      }
      throw new Fault('SIGSEGV', 'Segmentation fault', `${write ? 'Write to' : 'Read from'} unmapped address ${hex(addr)}.`, addr);
    }
    if (write && !s.writable) {
      throw new Fault('SIGSEGV', 'Segmentation fault', `Write to read-only memory at ${hex(addr)} in ${s.name}${s.name === '.rodata' ? ' (string literals cannot be modified)' : ''}.`, addr);
    }
    if (s === this.heap && this.sanitizer) this.checkHeap(addr, size, write);
    return s;
  }

  checkHeap(addr: number, size: number, write: boolean) {
    // binary search for the block starting at or before addr
    const b = this.blocks;
    let lo = 0, hi = b.length - 1, found: HeapBlock | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (b[mid].addr <= addr) { found = b[mid]; lo = mid + 1; } else hi = mid - 1;
    }
    const what = write ? 'WRITE' : 'READ';
    if (found && addr >= found.addr && addr + size <= found.addr + Math.max(found.size, 1) && found.size > 0) {
      if (found.freed) {
        throw new Fault('SIGABRT', 'AddressSanitizer: heap-use-after-free',
          `${what} of size ${size} at ${hex(addr)}, inside block #${found.id} (${found.size} bytes) that was allocated at line ${found.allocLine} and freed at line ${found.freeLine}.`, addr);
      }
      return;
    }
    // overflow: find nearest block
    const near = found && addr >= found.addr ? found : b[0];
    if (near) {
      const off = addr - (near.addr + near.size);
      const rel = off >= 0 ? `${off} bytes after` : `${near.addr - addr} bytes before`;
      throw new Fault('SIGABRT', 'AddressSanitizer: heap-buffer-overflow',
        `${what} of size ${size} at ${hex(addr)}, ${rel} the ${near.size}-byte block #${near.id} allocated at line ${near.allocLine}${near.freed ? ' (already freed)' : ''}.`, addr);
    }
    throw new Fault('SIGABRT', 'AddressSanitizer: wild pointer', `${what} of size ${size} at ${hex(addr)} in the heap, outside any allocation.`, addr);
  }

  read(addr: number, size: number): number {
    const s = this.seg(addr, size, false);
    const o = addr - s.start;
    switch (size) {
      case 1: return s.bytes[o];
      case 2: return s.view.getUint16(o, true);
      case 4: return s.view.getUint32(o, true);
      default: return s.view.getInt32(o + 4, true) * TWO32 + s.view.getUint32(o, true);
    }
  }

  write(addr: number, size: number, v: number) {
    const s = this.seg(addr, size, true);
    const o = addr - s.start;
    switch (size) {
      case 1: s.bytes[o] = low32(v) & 0xff; return;
      case 2: s.view.setUint16(o, low32(v) & 0xffff, true); return;
      case 4: s.view.setUint32(o, low32(v), true); return;
      default: {
        const n = norm64(v);
        const hi = Math.floor(n / TWO32);
        s.view.setUint32(o, n - hi * TWO32, true);
        s.view.setInt32(o + 4, hi, true);
      }
    }
  }

  /** Read without faults or sanitizer checks (for the debugger views). */
  peek(addr: number, size: number): number | null {
    const s = this.find(addr);
    if (!s || addr + size > s.end) return null;
    const o = addr - s.start;
    switch (size) {
      case 1: return s.bytes[o];
      case 2: return s.view.getUint16(o, true);
      case 4: return s.view.getUint32(o, true);
      default: return s.view.getInt32(o + 4, true) * TWO32 + s.view.getUint32(o, true);
    }
  }

  growHeap(newEnd: number) {
    const h = this.heap;
    const need = newEnd - h.start;
    if (need > h.bytes.length) {
      let cap = h.bytes.length;
      while (cap < need) cap *= 2;
      const nb = new Uint8Array(cap);
      nb.set(h.bytes);
      h.bytes = nb;
      h.view = new DataView(nb.buffer);
    }
    h.end = newEnd;
  }
}

// ---------- machine ----------

export type StopReason = 'exit' | 'fault' | 'breakpoint' | 'step' | 'budget';
export type RunMode = 'run' | 'continue' | 'into' | 'over' | 'out' | 'instr';

export interface OutputChunk { text: string; err: boolean }

export interface Frame {
  fn: FuncInfo;
  rbp: number | null;
  line: number;
  idx: number;          // instruction index (current, or the call instruction for callers)
  depth: number;
}

export interface ValueView {
  name: string;
  addr: number;
  ty: CType;
  value: string;
  note?: string;
  children?: ValueView[];
}

export class Machine {
  c: Compiled;
  mem = new Memory();
  regs = new Array<number>(REG_NAMES.length).fill(0);
  rip = 0;
  flags: { a: number; b: number; size: number } | null = null;
  steps = 0;
  depth = 0;
  status: 'ready' | 'paused' | 'exited' | 'faulted' = 'ready';
  exitCode = 0;
  fault: Fault | null = null;
  out: OutputChunk[] = [];
  outLen = 0;
  stdin: string;
  stdinPos = 0;
  brk: number;
  heapStart: number;
  nextBlockId = 1;
  randState = 1;
  strtokNext = 0;
  argvAddr = 0;
  changedRegs = new Set<number>();
  lastWrite: { addr: number; size: number } | null = null;
  leaks: HeapBlock[] = [];

  constructor(c: Compiled, opts: { stdin?: string; sanitizer?: boolean } = {}) {
    this.c = c;
    this.stdin = opts.stdin ?? '';
    this.mem.sanitizer = opts.sanitizer ?? true;
    this.mem.curLine = () => this.line;
    const m = this.mem;
    m.add('.text', c.textBase, Math.max(c.textEnd - c.textBase, 1), false, 'r-x');
    m.add('.rodata', c.rodataBase, Math.max(c.rodataEnd - c.rodataBase, 1), false, 'r--');
    m.add('.data', c.dataBase, Math.max(c.dataEnd - c.dataBase, 1), true, 'rw-');
    m.add('.bss', c.bssBase, Math.max(c.bssEnd - c.bssBase, 1), true, 'rw-');
    this.heapStart = Math.ceil(c.bssEnd / 0x1000) * 0x1000 + 0x1000;
    m.heap = m.add('[heap]', this.heapStart, 4096, true, 'rw-');
    m.heap.end = this.heapStart;   // empty until the first malloc
    this.brk = this.heapStart;
    m.stack = m.add('[stack]', STACK_TOP - STACK_SIZE, STACK_SIZE, true, 'rw-');
    // .text holds machine code; we fill it with a recognisable pattern
    const text = m.segs[0];
    for (const ins of c.insts) for (let k = 0; k < ins.size; k++) text.bytes[ins.addr - c.textBase + k] = k === 0 ? 0x48 : 0x90;
    for (const d of c.data) {
      const s = m.find(d.addr)!;
      s.bytes.set(d.bytes, d.addr - s.start);
    }
    // uninitialized stack memory holds leftovers from "earlier" code: fill with pseudo-random garbage
    let seed = 0x2545f491;
    const st = m.stack.bytes;
    for (let i = 0; i < st.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; st[i] = seed & 0xff; }
    // argv/envp area at the top of the stack
    const prog = './a.out';
    let sp = STACK_TOP - 64;
    const strAddr = sp;
    for (let i = 0; i < prog.length; i++) st[strAddr - m.stack.start + i] = prog.charCodeAt(i);
    st[strAddr - m.stack.start + prog.length] = 0;
    sp -= 32;
    this.argvAddr = sp;
    m.write(sp, 8, strAddr);
    m.write(sp + 8, 8, 0);
    sp -= 16;
    this.regs[R.rsp] = sp;
    this.regs[R.rdi] = 1;
    this.regs[R.rsi] = this.argvAddr;
    this.rip = c.entry;
  }

  get line(): number { return this.c.insts[this.rip]?.line ?? 0; }
  /** Source line of the instruction being executed (rip already points past it during step). */
  execLine = 0;
  get inst(): Inst | undefined { return this.c.insts[this.rip]; }

  // ----- register access -----
  readReg(r: number, size: number): number {
    const v = this.regs[r];
    return size === 8 ? v : size === 4 ? low32(v) : size === 2 ? low32(v) & 0xffff : low32(v) & 0xff;
  }
  writeReg(r: number, size: number, v: number) {
    this.regs[r] = size === 8 ? norm64(v) : size === 4 ? low32(v) : size === 2 ? low32(v) & 0xffff : low32(v) & 0xff;
    this.changedRegs.add(r);
  }
  addrOf(o: Opnd): number {
    return o.base === -1 ? o.abs! : this.regs[o.base!] + (o.disp ?? 0);
  }
  val(o: Opnd): number {
    switch (o.t) {
      case 'reg': return this.readReg(o.r!, o.size!);
      case 'imm': return o.v!;
      case 'mem': return this.mem.read(this.addrOf(o), o.size!);
      default: throw new Error('bad operand');
    }
  }
  set(o: Opnd, v: number) {
    if (o.t === 'reg') this.writeReg(o.r!, o.size!, v);
    else if (o.t === 'mem') {
      const a = this.addrOf(o);
      this.mem.write(a, o.size!, v);
      this.lastWrite = { addr: a, size: o.size! };
    } else throw new Error('bad destination');
  }
  push(v: number) {
    const sp = this.regs[R.rsp] - 8;
    this.regs[R.rsp] = sp;
    this.changedRegs.add(R.rsp);
    this.mem.write(sp, 8, v);
  }
  pop(): number {
    const sp = this.regs[R.rsp];
    const v = this.mem.read(sp, 8);
    this.regs[R.rsp] = sp + 8;
    this.changedRegs.add(R.rsp);
    return v;
  }

  private cond(cc: string): boolean {
    const f = this.flags!;
    const sa = sx(f.a, f.size), sb = sx(f.b, f.size);
    const ua = ux(f.a, f.size), ub = ux(f.b, f.size);
    switch (cc) {
      case 'e': return ua === ub;
      case 'ne': return ua !== ub;
      case 'l': return sa < sb;
      case 'le': return sa <= sb;
      case 'g': return sa > sb;
      case 'ge': return sa >= sb;
      case 'b': return ua < ub;
      case 'be': return ua <= ub;
      case 'a': return ua > ub;
      case 'ae': return ua >= ub;
    }
    throw new Error('bad condition ' + cc);
  }

  private alu(op: string, x: number, y: number, size: number): number {
    if (size === 8) {
      switch (op) {
        case 'add': return x + y;
        case 'sub': return x - y;
        case 'imul': { const r = x * y; return Math.abs(r) < 2 ** 53 ? r : fromBig(big(x) * big(y)); }
        case 'and': return fromBig(big(x) & big(y));
        case 'or': return fromBig(big(x) | big(y));
        case 'xor': return fromBig(big(x) ^ big(y));
        case 'sal': return fromBig(big(x) << BigInt(y & 63));
        case 'sar': return fromBig(big(x) >> BigInt(y & 63));
        case 'shr': return fromBig(BigInt.asUintN(64, big(x)) >> BigInt(y & 63));
      }
    } else {
      switch (op) {
        case 'add': return (x + y) >>> 0;
        case 'sub': return (x - y) >>> 0;
        case 'imul': return Math.imul(x | 0, y | 0) >>> 0;
        case 'and': return (x & y) >>> 0;
        case 'or': return (x | y) >>> 0;
        case 'xor': return (x ^ y) >>> 0;
        case 'sal': return (x << (y & 31)) >>> 0;
        case 'sar': return ((x | 0) >> (y & 31)) >>> 0;
        case 'shr': return (x >>> 0) >>> (y & 31);
      }
    }
    throw new Error('bad alu op ' + op);
  }

  /** Execute one instruction. */
  step() {
    const ins = this.c.insts[this.rip];
    if (!ins) throw new Fault('SIGSEGV', 'Segmentation fault', `Instruction pointer ${hex(this.rip)} is outside the program.`);
    this.execLine = ins.line;
    this.rip++;
    this.steps++;
    const { a, b } = ins;
    switch (ins.op) {
      case 'mov': case 'movabs': this.set(a!, this.val(b!)); break;
      case 'movsx': case 'movsxd': this.set(a!, sx(this.val(b!), b!.size!)); break;
      case 'movzx': this.set(a!, ux(this.val(b!), b!.size!)); break;
      case 'lea': this.set(a!, this.addrOf(b!)); break;
      case 'add': case 'sub': case 'and': case 'or': case 'xor': case 'sal': case 'sar': case 'shr':
        this.set(a!, this.alu(ins.op, this.val(a!), this.val(b!), a!.size!));
        break;
      case 'imul':
        if (ins.c) this.set(a!, this.alu('imul', this.val(b!), this.val(ins.c), a!.size!));
        else this.set(a!, this.alu('imul', this.val(a!), this.val(b!), a!.size!));
        break;
      case 'neg': this.set(a!, a!.size === 8 ? -this.val(a!) : (-(this.val(a!) | 0)) >>> 0); break;
      case 'not': this.set(a!, a!.size === 8 ? -this.val(a!) - 1 : ~this.val(a!) >>> 0); break;
      case 'cmp': this.flags = { a: this.val(a!), b: this.val(b!), size: a!.size! }; break;
      case 'cdq': this.writeReg(R.rdx, 4, (this.readReg(R.rax, 4) | 0) < 0 ? 0xffffffff : 0); break;
      case 'cqo': this.writeReg(R.rdx, 8, this.regs[R.rax] < 0 ? -1 : 0); break;
      case 'idiv': case 'div': this.divide(ins.op === 'idiv', a!); break;
      case 'push': this.push(this.val(a!)); break;
      case 'pop': this.set(a!, this.pop()); break;
      case 'leave':
        this.regs[R.rsp] = this.regs[R.rbp];
        this.regs[R.rbp] = this.pop();
        this.changedRegs.add(R.rbp);
        break;
      case 'call':
        if (a!.t === 'sym') this.callBuiltin(a!.sym!);
        else {
          this.push(this.c.insts[this.rip].addr);
          this.rip = a!.target!;
          this.depth++;
        }
        break;
      case 'ret': {
        const ra = this.pop();
        const idx = this.c.addrToIdx.get(ra);
        if (idx === undefined) {
          throw new Fault('SIGSEGV', 'Segmentation fault', `ret jumped to ${hex(ra)}, which is not code. The return address on the stack was overwritten, typically by writing past the end of a local array (a stack buffer overflow).`, ra);
        }
        this.rip = idx;
        this.depth--;
        break;
      }
      case 'jmp': this.rip = a!.target!; break;
      case 'rep movsb': this.repMovsb(); break;
      case 'rep stosb': this.repStosb(); break;
      case 'nop': break;
      default:
        if (ins.op.startsWith('j')) { if (this.cond(ins.op.slice(1))) this.rip = a!.target!; break; }
        if (ins.op.startsWith('set')) { this.set(a!, this.cond(ins.op.slice(3)) ? 1 : 0); break; }
        throw new Error('unknown instruction ' + ins.op);
    }
  }

  private divide(signed: boolean, o: Opnd) {
    const size = o.size!;
    if (size === 8) {
      const d = big(this.val(o));
      if (d === 0n) throw new Fault('SIGFPE', 'Floating point exception', `Integer division by zero at line ${this.execLine}.`);
      const n = big(this.regs[R.rax]);
      if (signed) {
        this.writeReg(R.rax, 8, fromBig(n / d)); this.writeReg(R.rdx, 8, fromBig(n % d));
      } else {
        const un = BigInt.asUintN(64, n), ud = BigInt.asUintN(64, d);
        this.writeReg(R.rax, 8, fromBig(un / ud)); this.writeReg(R.rdx, 8, fromBig(un % ud));
      }
      return;
    }
    const raw = this.val(o);
    if (signed) {
      const d = raw | 0, n = this.readReg(R.rax, 4) | 0;
      if (d === 0) throw new Fault('SIGFPE', 'Floating point exception', `Integer division by zero at line ${this.execLine}.`);
      if (n === -2147483648 && d === -1) throw new Fault('SIGFPE', 'Floating point exception', `INT_MIN / -1 overflows int (line ${this.execLine}).`);
      const q = Math.trunc(n / d);
      this.writeReg(R.rax, 4, q); this.writeReg(R.rdx, 4, n - q * d);
    } else {
      const d = raw >>> 0, n = this.readReg(R.rax, 4) >>> 0;
      if (d === 0) throw new Fault('SIGFPE', 'Floating point exception', `Integer division by zero at line ${this.execLine}.`);
      this.writeReg(R.rax, 4, Math.floor(n / d)); this.writeReg(R.rdx, 4, n % d);
    }
  }

  private repMovsb() {
    const n = ux(this.regs[R.rcx], 8);
    let s = this.regs[R.rsi], d = this.regs[R.rdi];
    for (let i = 0; i < n; i++) this.mem.write(d + i, 1, this.mem.read(s + i, 1));
    this.lastWrite = { addr: d, size: n };
    this.writeReg(R.rsi, 8, s + n); this.writeReg(R.rdi, 8, d + n); this.writeReg(R.rcx, 8, 0);
  }
  private repStosb() {
    const n = ux(this.regs[R.rcx], 8), v = this.readReg(R.rax, 1), d = this.regs[R.rdi];
    for (let i = 0; i < n; i++) this.mem.write(d + i, 1, v);
    this.lastWrite = { addr: d, size: n };
    this.writeReg(R.rdi, 8, d + n); this.writeReg(R.rcx, 8, 0);
  }

  // ----- running -----
  /**
   * Run until something interesting happens. For long runs the UI calls this repeatedly with
   * `resume` set, passing back the original `startDepth`, so step-over/out keep their target.
   */
  run(mode: RunMode, breakpoints: Set<number>, budget: number, opts: { startDepth?: number; resume?: boolean } = {}): StopReason {
    if (this.status === 'exited' || this.status === 'faulted') return this.status === 'exited' ? 'exit' : 'fault';
    if (!opts.resume) { this.changedRegs.clear(); this.lastWrite = null; }
    const startDepth = opts.startDepth ?? this.depth;
    const insts = this.c.insts;
    let first = !opts.resume;
    let at = this.rip;
    try {
      for (let n = 0; n < budget; n++) {
        const ins = insts[this.rip];
        if (!first && ins) {
          if (mode === 'instr') { this.status = 'paused'; return 'step'; }
          if (ins.stmt && ins.fn !== '_start') {
            if (mode !== 'run' && breakpoints.has(ins.line)) { this.status = 'paused'; return 'breakpoint'; }
            if (mode === 'into' || (mode === 'over' && this.depth <= startDepth) || (mode === 'out' && this.depth < startDepth)) {
              this.status = 'paused';
              return 'step';
            }
          }
        }
        first = false;
        at = this.rip;
        this.step();
      }
      return 'budget';
    } catch (e) {
      if (e instanceof Exit) {
        this.status = 'exited';
        this.exitCode = e.code;
        this.finish();
        return 'exit';
      }
      if (e instanceof Fault) {
        this.status = 'faulted';
        this.fault = e;
        this.rip = at;             // leave rip on the faulting instruction for the post-mortem view
        return 'fault';
      }
      throw e;
    }
  }

  private finish() {
    this.leaks = this.mem.blocks.filter((b) => !b.freed && b.size > 0);
    if (this.mem.sanitizer && this.leaks.length) {
      const total = this.leaks.reduce((s, b) => s + b.size, 0);
      let msg = `\n=================================================================\n==1==ERROR: LeakSanitizer: detected memory leaks\n`;
      for (const b of this.leaks) msg += `\nDirect leak of ${b.size} byte(s) in 1 object(s) allocated at line ${b.allocLine} (block #${b.id}, ${hex(b.addr)})\n`;
      msg += `\nSUMMARY: AddressSanitizer: ${total} byte(s) leaked in ${this.leaks.length} allocation(s).\n`;
      this.write(msg, true);
    }
  }

  write(text: string, err = false) {
    this.outLen += text.length;
    if (this.outLen > OUTPUT_LIMIT) throw new Fault('SIGKILL', 'Output limit exceeded', `The program printed more than ${OUTPUT_LIMIT} characters, so the simulator stopped it. Is there an infinite loop?`);
    const last = this.out[this.out.length - 1];
    if (last && last.err === err) last.text += text;
    else this.out.push({ text, err });
  }

  // ----- libc -----
  arg(i: number): number {
    return i < 6 ? this.regs[ARG_REGS[i]] : this.mem.read(this.regs[R.rsp] + 8 * (i - 6), 8);
  }
  argInt(i: number) { return sx(this.arg(i), 4); }
  ret(v: number, size = 4) { this.writeReg(R.rax, size === 8 ? 8 : 4, v); }

  readString(addr: number, max = 1 << 20): string {
    if (addr === 0) throw new Fault('SIGSEGV', 'Segmentation fault', 'A NULL pointer was passed where a string was expected.', 0);
    let s = '';
    for (let i = 0; i < max; i++) {
      const c = this.mem.read(addr + i, 1);
      if (c === 0) return s;
      s += String.fromCharCode(c);
    }
    throw new Fault('SIGSEGV', 'Segmentation fault', `String at ${hex(addr)} has no terminating '\\0' within ${max} bytes.`);
  }
  writeString(addr: number, s: string) {
    for (let i = 0; i < s.length; i++) this.mem.write(addr + i, 1, s.charCodeAt(i));
    this.mem.write(addr + s.length, 1, 0);
  }

  format(fmt: string, nextArg: () => number): string {
    let out = '';
    for (let i = 0; i < fmt.length; i++) {
      const ch = fmt[i];
      if (ch !== '%') { out += ch; continue; }
      const m = /^([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d*))?(hh|h|ll|l|z|j|t)?([diouxXcspn%fFeEgGaA])/.exec(fmt.slice(i + 1));
      if (!m) { out += ch; continue; }
      i += m[0].length;
      const [, flags, w, prec, len, conv] = m;
      let width = w === '*' ? sx(nextArg(), 4) : w ? parseInt(w) : 0;
      let left = flags.includes('-');
      if (width < 0) { left = true; width = -width; }
      let precision = prec === undefined ? -1 : prec === '*' ? sx(nextArg(), 4) : parseInt(prec || '0');
      const pad = (s: string, numeric: boolean) => {
        if (s.length >= width) return s;
        if (left) return s + ' '.repeat(width - s.length);
        if (numeric && flags.includes('0') && precision < 0) {
          const sign = /^[-+ ]|^0x/i.exec(s)?.[0] ?? '';
          return sign + '0'.repeat(width - s.length) + s.slice(sign.length);
        }
        return ' '.repeat(width - s.length) + s;
      };
      const wide = len === 'l' || len === 'll' || len === 'z' || len === 'j' || len === 't';
      switch (conv) {
        case '%': out += '%'; break;
        case 'd': case 'i': {
          const raw = nextArg();
          const v = wide ? raw : len === 'h' ? sx(raw, 2) : len === 'hh' ? sx(raw, 1) : sx(raw, 4);
          let digits = Math.abs(v).toString();
          if (precision >= 0) digits = digits.padStart(precision, '0');
          const sign = v < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
          out += pad(sign + digits, true);
          break;
        }
        case 'u': case 'x': case 'X': case 'o': {
          const raw = nextArg();
          const v = wide ? ux(raw, 8) : len === 'h' ? ux(raw, 2) : len === 'hh' ? ux(raw, 1) : ux(raw, 4);
          const base = conv === 'u' ? 10 : conv === 'o' ? 8 : 16;
          let digits = BigInt(Math.round(v)).toString(base);
          if (conv === 'X') digits = digits.toUpperCase();
          if (precision >= 0) digits = digits.padStart(precision, '0');
          const prefix = flags.includes('#') && v !== 0 ? (conv === 'o' ? '0' : conv === 'x' ? '0x' : conv === 'X' ? '0X' : '') : '';
          out += pad(prefix + digits, true);
          break;
        }
        case 'c': out += pad(String.fromCharCode(ux(nextArg(), 1)), false); break;
        case 's': {
          const p = nextArg();
          let s = p === 0 ? '(null)' : this.readString(p);
          if (precision >= 0) s = s.slice(0, precision);
          out += pad(s, false);
          break;
        }
        case 'p': { const p = nextArg(); out += pad(p === 0 ? '(nil)' : hex(p), false); break; }
        case 'n': this.mem.write(nextArg(), 4, out.length); break;
        default:
          throw new Fault('SIGABRT', 'Unsupported format', `printf conversion %${conv} needs floating point, which the simulator does not support.`);
      }
    }
    return out;
  }

  private malloc(n: number): number {
    if (n < 0 || n > HEAP_LIMIT) return 0;
    // first fit among freed blocks of exactly-enough capacity (like a simple free list)
    const reuse = this.mem.blocks.find((b) => b.freed && b.size >= n && b.size <= n + 32 && n > 0);
    if (reuse) {
      reuse.freed = false;
      reuse.size = n;
      reuse.allocLine = this.execLine;
      reuse.freeLine = undefined;
      reuse.id = this.nextBlockId++;
      return reuse.addr;
    }
    const addr = Math.ceil((this.brk + 16) / 16) * 16;     // 16-byte chunk header before each block
    const end = addr + Math.max(n, 1);
    if (end - this.heapStart > HEAP_LIMIT) return 0;
    this.mem.growHeap(Math.ceil(end / 16) * 16);
    this.brk = end;
    const hdr = addr - 8;
    const saved = this.mem.sanitizer;
    this.mem.sanitizer = false;
    this.mem.write(hdr, 8, Math.ceil((n + 16) / 16) * 16 + 1);   // glibc-style size|PREV_INUSE
    this.mem.sanitizer = saved;
    this.mem.blocks.push({ id: this.nextBlockId++, addr, size: n, freed: false, allocLine: this.execLine });
    return addr;
  }

  private free(p: number) {
    if (p === 0) return;
    const b = this.mem.blocks.find((x) => x.addr === p);
    if (!b) {
      throw new Fault('SIGABRT', this.mem.sanitizer ? 'AddressSanitizer: attempting free on address which was not malloc()-ed' : 'free(): invalid pointer',
        `free(${hex(p)}) at line ${this.execLine}: that address was not returned by malloc, calloc or realloc.`, p);
    }
    if (b.freed) {
      throw new Fault('SIGABRT', this.mem.sanitizer ? 'AddressSanitizer: attempting double-free' : 'free(): double free detected',
        `free(${hex(p)}) at line ${this.execLine}: block #${b.id} was already freed at line ${b.freeLine}.`, p);
    }
    b.freed = true;
    b.freeLine = this.execLine;
  }

  callBuiltin(name: string) {
    const m = this;
    const cmpBytes = (a: number, b: number, n: number, str: boolean) => {
      for (let i = 0; i < n; i++) {
        const x = m.mem.read(a + i, 1), y = m.mem.read(b + i, 1);
        if (x !== y) return x < y ? -1 : 1;
        if (str && x === 0) return 0;
      }
      return 0;
    };
    const isC = (fn: (c: number) => boolean) => () => m.ret(fn(sx(m.arg(0), 4)) ? 1 : 0);
    const stream = (h: number) => {
      if (h !== 1 && h !== 2) throw new Fault('SIGSEGV', 'Segmentation fault', `Invalid FILE * ${hex(h)} (only stdout and stderr exist in the simulator).`);
      return h === 2;
    };
    switch (name) {
      case 'printf': { let k = 1; const s = m.format(m.readString(m.arg(0)), () => m.arg(k++)); m.write(s); m.ret(s.length); return; }
      case 'fprintf': { const e = stream(m.arg(0)); let k = 2; const s = m.format(m.readString(m.arg(1)), () => m.arg(k++)); m.write(s, e); m.ret(s.length); return; }
      case 'sprintf': { let k = 2; const s = m.format(m.readString(m.arg(1)), () => m.arg(k++)); m.writeString(m.arg(0), s); m.ret(s.length); return; }
      case 'snprintf': {
        let k = 3; const s = m.format(m.readString(m.arg(2)), () => m.arg(k++));
        const n = ux(m.arg(1), 8);
        if (n > 0) m.writeString(m.arg(0), s.slice(0, n - 1));
        m.ret(s.length); return;
      }
      case 'puts': { m.write(m.readString(m.arg(0)) + '\n'); m.ret(1); return; }
      case 'fputs': { const e = stream(m.arg(1)); m.write(m.readString(m.arg(0)), e); m.ret(1); return; }
      case 'putchar': { const c = ux(m.arg(0), 1); m.write(String.fromCharCode(c)); m.ret(c); return; }
      case 'fputc': case 'putc': { const e = stream(m.arg(1)); const c = ux(m.arg(0), 1); m.write(String.fromCharCode(c), e); m.ret(c); return; }
      case 'getchar': { m.ret(m.stdinPos < m.stdin.length ? m.stdin.charCodeAt(m.stdinPos++) & 0xff : -1); return; }
      case 'scanf': { m.ret(m.scanf()); return; }
      case 'malloc': { m.ret(m.malloc(ux(m.arg(0), 8)), 8); return; }
      case 'calloc': {
        const n = ux(m.arg(0), 8) * ux(m.arg(1), 8);
        const p = m.malloc(n);
        for (let i = 0; i < n; i++) m.mem.write(p + i, 1, 0);
        m.ret(p, 8); return;
      }
      case 'realloc': {
        const old = m.arg(0), n = ux(m.arg(1), 8);
        if (old === 0) { m.ret(m.malloc(n), 8); return; }
        const b = m.mem.blocks.find((x) => x.addr === old && !x.freed);
        if (!b) { m.free(old); return; }
        const p = m.malloc(n);
        for (let i = 0; i < Math.min(n, b.size); i++) m.mem.write(p + i, 1, m.mem.read(old + i, 1));
        m.free(old);
        m.ret(p, 8); return;
      }
      case 'free': { m.free(m.arg(0)); return; }
      case 'strlen': { m.ret(m.readString(m.arg(0)).length, 8); return; }
      case 'strcpy': { const d = m.arg(0); m.writeString(d, m.readString(m.arg(1))); m.ret(d, 8); return; }
      case 'strncpy': {
        const d = m.arg(0), s = m.arg(1), n = ux(m.arg(2), 8);
        let i = 0;
        for (; i < n; i++) { const c = m.mem.read(s + i, 1); m.mem.write(d + i, 1, c); if (c === 0) break; }
        for (; i < n; i++) m.mem.write(d + i, 1, 0);
        m.ret(d, 8); return;
      }
      case 'strcat': { const d = m.arg(0); const cur = m.readString(d); m.writeString(d + cur.length, m.readString(m.arg(1))); m.ret(d, 8); return; }
      case 'strcmp': { m.ret(cmpBytes(m.arg(0), m.arg(1), 1 << 30, true)); return; }
      case 'strncmp': { m.ret(cmpBytes(m.arg(0), m.arg(1), ux(m.arg(2), 8), true)); return; }
      case 'strchr': case 'strrchr': {
        const s = m.arg(0), c = ux(m.arg(1), 1), str = m.readString(s);
        const i = c === 0 ? str.length : name === 'strchr' ? str.indexOf(String.fromCharCode(c)) : str.lastIndexOf(String.fromCharCode(c));
        m.ret(i < 0 ? 0 : s + i, 8); return;
      }
      case 'strstr': { const s = m.arg(0); const i = m.readString(s).indexOf(m.readString(m.arg(1))); m.ret(i < 0 ? 0 : s + i, 8); return; }
      case 'memset': { const d = m.arg(0), c = ux(m.arg(1), 1), n = ux(m.arg(2), 8); for (let i = 0; i < n; i++) m.mem.write(d + i, 1, c); m.ret(d, 8); return; }
      case 'memcpy': case 'memmove': {
        const d = m.arg(0), s = m.arg(1), n = ux(m.arg(2), 8);
        if (name === 'memcpy' && m.mem.sanitizer && n > 0 && d < s + n && s < d + n) {
          throw new Fault('SIGABRT', 'AddressSanitizer: memcpy-param-overlap', `memcpy at line ${m.execLine}: source [${hex(s)}, +${n}) and destination [${hex(d)}, +${n}) overlap. Use memmove for overlapping regions.`);
        }
        const tmp: number[] = [];
        for (let i = 0; i < n; i++) tmp.push(m.mem.read(s + i, 1));
        for (let i = 0; i < n; i++) m.mem.write(d + i, 1, tmp[i]);
        m.ret(d, 8); return;
      }
      case 'memcmp': { m.ret(cmpBytes(m.arg(0), m.arg(1), ux(m.arg(2), 8), false)); return; }
      case 'abs': { m.ret(Math.abs(m.argInt(0))); return; }
      case 'labs': { m.ret(Math.abs(m.arg(0)), 8); return; }
      case 'rand': { m.randState = (Math.imul(m.randState, 1103515245) + 12345) >>> 0; m.ret((m.randState >>> 1) & 0x7fffffff); return; }
      case 'srand': { m.randState = ux(m.arg(0), 4); return; }
      case 'time': { const t = Math.floor(Date.now() / 1000); if (m.arg(0)) m.mem.write(m.arg(0), 8, t); m.ret(t, 8); return; }
      case 'exit': throw new Exit(sx(m.arg(0), 4) & 0xff);
      case 'abort': throw new Fault('SIGABRT', 'Aborted', `abort() was called at line ${m.execLine}.`);
      case 'perror': {
        const msg = m.arg(0) ? m.readString(m.arg(0)) : '';
        m.write(`${msg ? msg + ': ' : ''}Success\n`, true);   // errno is always 0 in the simulator
        return;
      }
      case 'strtok': {
        let p = m.arg(0);
        const delims = m.readString(m.arg(1));
        if (p === 0) p = m.strtokNext;
        if (p === 0) { m.ret(0, 8); return; }
        while (true) { const c = m.mem.read(p, 1); if (c === 0) { m.strtokNext = 0; m.ret(0, 8); return; } if (!delims.includes(String.fromCharCode(c))) break; p++; }
        const tok = p;
        while (true) {
          const c = m.mem.read(p, 1);
          if (c === 0) { m.strtokNext = 0; break; }
          if (delims.includes(String.fromCharCode(c))) { m.mem.write(p, 1, 0); m.strtokNext = p + 1; break; }
          p++;
        }
        m.ret(tok, 8); return;
      }
      case 'atoi': case 'atol': case 'strtol': case 'strtoul': {
        const s = m.readString(m.arg(0));
        const base = name === 'strtol' || name === 'strtoul' ? sx(m.arg(2), 4) : 10;
        const mm = /^\s*([+-]?)(0x)?([0-9a-zA-Z]*)/i.exec(s)!;
        const b = base === 0 ? (mm[2] ? 16 : mm[3].startsWith('0') && mm[3].length > 1 ? 8 : 10) : base;
        let v = 0, used = 0;
        for (const ch of mm[3]) {
          const d = parseInt(ch, 36);
          if (isNaN(d) || d >= b) break;
          v = v * b + d; used++;
        }
        if (mm[1] === '-') v = -v;
        if ((name === 'strtol' || name === 'strtoul') && m.arg(1)) m.mem.write(m.arg(1), 8, m.arg(0) + (used ? mm[0].length - (mm[3].length - used) : 0));
        m.ret(v, name === 'atoi' ? 4 : 8); return;
      }
      case 'toupper': { const c = sx(m.arg(0), 4); m.ret(c >= 97 && c <= 122 ? c - 32 : c); return; }
      case 'tolower': { const c = sx(m.arg(0), 4); m.ret(c >= 65 && c <= 90 ? c + 32 : c); return; }
      case 'isdigit': return isC((c) => c >= 48 && c <= 57)();
      case 'isalpha': return isC((c) => (c | 32) >= 97 && (c | 32) <= 122)();
      case 'isalnum': return isC((c) => (c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 122))();
      case 'isspace': return isC((c) => c === 32 || (c >= 9 && c <= 13))();
      case 'isupper': return isC((c) => c >= 65 && c <= 90)();
      case 'islower': return isC((c) => c >= 97 && c <= 122)();
      case 'isxdigit': return isC((c) => (c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 102))();
      case 'isprint': return isC((c) => c >= 32 && c < 127)();
      case 'ispunct': return isC((c) => c > 32 && c < 127 && !((c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 122)))();
      case '__assert_fail': {
        const fn = this.frames()[0]?.fn.name ?? 'main';
        m.write(`a.out: main.c:${sx(m.arg(1), 4)}: ${fn}: Assertion \`${m.readString(m.arg(0))}' failed.\n`, true);
        throw new Fault('SIGABRT', 'Aborted (assertion failed)', `assert(${m.readString(m.arg(0))}) failed at line ${sx(m.arg(1), 4)}.`);
      }
    }
    throw new Fault('SIGSYS', 'Unsupported call', `The library function ${name} is not implemented in the simulator.`);
  }

  private scanf(): number {
    const fmt = this.readString(this.arg(0));
    let k = 1, count = 0;
    const s = this.stdin;
    const skipWs = () => { while (this.stdinPos < s.length && /\s/.test(s[this.stdinPos])) this.stdinPos++; };
    for (let i = 0; i < fmt.length; i++) {
      const ch = fmt[i];
      if (/\s/.test(ch)) { skipWs(); continue; }
      if (ch !== '%') {
        if (s[this.stdinPos] !== ch) return count;
        this.stdinPos++;
        continue;
      }
      const m = /^(\*)?(\d+)?(hh|h|ll|l|z)?([diuxcs%])/.exec(fmt.slice(i + 1));
      if (!m) throw new Fault('SIGABRT', 'Unsupported format', `scanf format "%${fmt.slice(i + 1, i + 3)}" is not supported by the simulator.`);
      i += m[0].length;
      const [, suppress, w, len, conv] = m;
      const width = w ? parseInt(w) : Infinity;
      if (conv === '%') { skipWs(); if (s[this.stdinPos] !== '%') return count; this.stdinPos++; continue; }
      if (conv !== 'c') skipWs();
      if (this.stdinPos >= s.length) return count === 0 ? -1 : count;
      if (conv === 'c') {
        const n = w ? width : 1;
        const dst = suppress ? 0 : this.arg(k++);
        for (let j = 0; j < n && this.stdinPos < s.length; j++) if (dst) this.mem.write(dst + j, 1, s.charCodeAt(this.stdinPos++)); else this.stdinPos++;
      } else if (conv === 's') {
        let word = '';
        while (this.stdinPos < s.length && !/\s/.test(s[this.stdinPos]) && word.length < width) word += s[this.stdinPos++];
        if (!suppress) this.writeString(this.arg(k++), word);
      } else {
        const re = conv === 'x' ? /^[+-]?(0x)?[0-9a-f]+/i : /^[+-]?\d+/;
        const mm = re.exec(s.slice(this.stdinPos, this.stdinPos + (isFinite(width) ? width : 64)));
        if (!mm) return count;
        this.stdinPos += mm[0].length;
        const v = parseInt(mm[0], conv === 'x' ? 16 : 10);
        if (!suppress) {
          const dst = this.arg(k++);
          const size = len === 'l' || len === 'll' || len === 'z' ? 8 : len === 'h' ? 2 : len === 'hh' ? 1 : 4;
          this.mem.write(dst, size, v);
        }
      }
      if (!suppress) count++;
    }
    return count;
  }

  // ---------- debugger views ----------

  fnAt(idx: number): FuncInfo | undefined {
    return this.c.funcs.find((f) => idx >= f.start && idx < f.end);
  }

  /** Set by frames() when the frame-pointer chain could not be followed back to _start. */
  backtraceCorrupt = false;

  frames(): Frame[] {
    const frames: Frame[] = [];
    this.backtraceCorrupt = false;
    let idx = this.rip;
    let fn = this.fnAt(idx);
    if (!fn) return frames;
    let rbp: number | null = this.regs[R.rbp];
    let retSlot: number | null = null;
    const k = idx - fn.start;
    const op = this.c.insts[idx]?.op;
    // inside the prologue/epilogue the frame pointer still belongs to the caller
    if (fn.name !== '_start' && (k === 0 || op === 'ret')) { retSlot = this.regs[R.rsp]; }
    else if (fn.name !== '_start' && (k === 1 || (op === 'pop' && this.c.insts[idx + 1]?.op === 'ret'))) { retSlot = this.regs[R.rsp] + 8; }
    let depth = 0;
    frames.push({ fn, rbp: retSlot === null ? rbp : null, line: this.c.insts[idx]?.line ?? 0, idx, depth: depth++ });
    for (let guard = 0; guard < 10000; guard++) {
      if (fn.name === '_start') break;
      let ra: number | null;
      let nextRbp: number | null;
      if (retSlot !== null) { ra = this.mem.peek(retSlot, 8); nextRbp = rbp; retSlot = null; }
      else { ra = rbp === null ? null : this.mem.peek(rbp + 8, 8); nextRbp = rbp === null ? null : this.mem.peek(rbp, 8); }
      if (ra === null) { this.backtraceCorrupt = true; break; }
      const ri = this.c.addrToIdx.get(ra);
      if (ri === undefined) { this.backtraceCorrupt = true; break; }
      const callIdx = ri - 1;
      fn = this.fnAt(callIdx);
      if (!fn) { this.backtraceCorrupt = true; break; }
      rbp = nextRbp;
      frames.push({ fn, rbp, line: this.c.insts[callIdx].line, idx: callIdx, depth: depth++ });
    }
    return frames;
  }

  symbolize(addr: number): string {
    if (addr === 0) return 'NULL';
    const c = this.c;
    if (addr >= c.textBase && addr < c.textEnd) {
      let best: Inst | undefined;
      for (const ins of c.insts) if (ins.addr <= addr) best = ins;
      const f = best ? this.fnAt(c.insts.indexOf(best)) : undefined;
      if (f) return `<${f.name}+${addr - c.insts[f.start].addr}>`;
    }
    const s = c.strings.find((x) => addr >= x.addr && addr <= x.addr + x.text.length);
    if (s) {
      const off = addr - s.addr;
      const t = s.text.slice(off);
      return `${s.label}${off ? '+' + off : ''} "${t.length > 24 ? t.slice(0, 24) + '…' : t}"`.replace(/\n/g, '\\n');
    }
    const g = c.globals.find((x) => addr >= x.addr && addr < x.addr + Math.max(x.size, 1));
    if (g) return `&${g.fn ? g.fn + '::' : ''}${g.name}${addr - g.addr ? '+' + (addr - g.addr) : ''}`;
    if (addr >= this.heapStart && addr < this.brk + 16) {
      const b = this.mem.blocks.find((x) => addr >= x.addr && addr < x.addr + Math.max(x.size, 1));
      if (b) return `heap block #${b.id}${addr - b.addr ? '+' + (addr - b.addr) : ''}${b.freed ? ' (freed!)' : ''}`;
      return 'heap (outside any block)';
    }
    if (addr >= this.mem.stack.start && addr <= STACK_TOP) {
      for (const f of this.frames()) {
        if (f.rbp === null) continue;
        for (const v of f.fn.locals) {
          const a = f.rbp - v.offset;
          if (addr >= a && addr < a + sizeOf(v.ty)) return `&${f.fn.name}::${v.name}${addr - a ? '+' + (addr - a) : ''}`;
        }
      }
      if (addr >= this.argvAddr) return 'argv area';
      return 'stack';
    }
    return '';
  }

  /** Render a value of a type at an address for the variables view. */
  view(name: string, addr: number, ty: CType, depth = 0): ValueView {
    const read = (size: number) => this.mem.peek(addr, size);
    const v: ValueView = { name, addr, ty, value: '' };
    switch (ty.k) {
      case 'char': {
        const raw = read(1);
        if (raw === null) { v.value = '<unmapped>'; break; }
        const n = ty.uns ? raw : sx(raw, 1);
        const ch = raw >= 32 && raw < 127 ? `'${String.fromCharCode(raw)}'` : raw === 0 ? "'\\0'" : raw === 10 ? "'\\n'" : `'\\x${raw.toString(16).padStart(2, '0')}'`;
        v.value = `${n} ${ch}`;
        break;
      }
      case 'short': case 'int': case 'long': {
        const size = sizeOf(ty);
        const raw = read(size);
        if (raw === null) { v.value = '<unmapped>'; break; }
        v.value = String(ty.uns ? ux(raw, size) : sx(raw, size));
        break;
      }
      case 'ptr': {
        const raw = read(8);
        if (raw === null) { v.value = '<unmapped>'; break; }
        v.value = raw === 0 ? 'NULL' : hex(raw);
        if (raw !== 0) {
          const sym = this.symbolize(raw);
          if (ty.to.k === 'char' && raw) {
            let s = '';
            for (let i = 0; i < 40; i++) {
              const ch = this.mem.peek(raw + i, 1);
              if (ch === null) { s = ''; break; }
              if (ch === 0) break;
              s += String.fromCharCode(ch);
            }
            v.note = (sym ? sym.replace(/ ".*"$/, '') + ' ' : '') + JSON.stringify(s);
          } else v.note = sym || 'points nowhere valid';
          // only expand pointers that point into mapped, non-freed memory
          if (ty.to.k === 'struct' && depth < 1 && this.mem.peek(raw, sizeOf(ty.to)) !== null) {
            const blk = this.mem.blocks.find((b) => raw >= b.addr && raw < b.addr + Math.max(b.size, 1));
            const inHeap = raw >= this.heapStart && raw < this.brk;
            if (!(blk?.freed) && (!inHeap || blk)) v.children = [this.view('*' + name, raw, ty.to, depth + 1)];
          }
        }
        break;
      }
      case 'array': {
        const elemSize = sizeOf(ty.of);
        const n = Math.min(ty.len, 64);
        if (ty.of.k === 'char') {
          let s = '';
          for (let i = 0; i < ty.len; i++) {
            const ch = this.mem.peek(addr + i, 1);
            if (ch === null || ch === 0) break;
            s += String.fromCharCode(ch);
          }
          v.value = JSON.stringify(s);
        }
        v.children = [];
        for (let i = 0; i < n; i++) v.children.push(this.view(`[${i}]`, addr + i * elemSize, ty.of, depth + 1));
        if (ty.of.k !== 'char') v.value = `{${v.children.slice(0, 8).map((c) => c.value.split(' ')[0]).join(', ')}${ty.len > 8 ? ', …' : ''}}`;
        break;
      }
      case 'struct': {
        v.children = ty.members.map((m) => this.view('.' + m.name, addr + m.offset, m.ty, depth + 1));
        v.value = `{${v.children.slice(0, 4).map((c) => `${c.name.slice(1)} = ${c.value.split(' ')[0]}`).join(', ')}${ty.members.length > 4 ? ', …' : ''}}`;
        break;
      }
      default:
        v.value = '?';
    }
    return v;
  }

  locals(f: Frame): ValueView[] {
    if (f.rbp === null) return [];
    return f.fn.locals.map((v: Var) => {
      const vv = this.view(v.name, f.rbp! - v.offset, v.ty);
      return vv;
    });
  }

  globalViews(): { g: GlobalSym; v: ValueView }[] {
    return this.c.globals.map((g) => ({ g, v: this.view(g.fn ? `${g.fn}::${g.name}` : g.name, g.addr, g.ty) }));
  }

  typeLabel(ty: CType) { return typeName(ty); }
}

export { R as REG };
