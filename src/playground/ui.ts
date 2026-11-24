// Playground UI: CodeMirror editor + assembly view + debugger inspector, driving the simulator.

import { EditorView, basicSetup } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState, StateField, StateEffect, RangeSet, Compartment, type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, gutter, GutterMarker, keymap } from '@codemirror/view';
import {
  compile, Machine, hex, REG_NAMES, STACK_TOP,
  type Compiled, type ValueView, type RunMode, type StopReason,
} from './index.ts';
import { EXAMPLES } from './examples.ts';
import { sizeOf } from './types.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const STORAGE_KEY = 'cdoc-playground-code';
const CHUNK = 250_000;
const MAX_STEPS = 60_000_000;

// ---------- editor extensions ----------

function lineLayer(cls: string) {
  const set = StateEffect.define<{ line: number; style?: string }[]>();
  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(deco, tr) {
      deco = deco.map(tr.changes);
      for (const e of tr.effects) {
        if (!e.is(set)) continue;
        const doc = tr.state.doc;
        const ranges = e.value
          .filter((d) => d.line >= 1 && d.line <= doc.lines)
          .sort((a, b) => a.line - b.line)
          .map((d) => Decoration.line({ class: cls, attributes: d.style ? { style: d.style } : undefined }).range(doc.line(d.line).from));
        deco = Decoration.set(ranges, true);
      }
      return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
  return { set, field };
}
const colorLayer = lineLayer('pg-color');
const execLayer = lineLayer('pg-exec');
const frameLayer = lineLayer('pg-frame');
const errorLayer = lineLayer('pg-error');
const hoverLayer = lineLayer('pg-hover');

const bpEffect = StateEffect.define<{ pos: number; on: boolean }>({ map: (v, m) => ({ pos: m.mapPos(v.pos), on: v.on }) });
const bpClear = StateEffect.define<null>();
const bpMarker = new (class extends GutterMarker { toDOM() { return document.createTextNode('●'); } })();
const bpField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(set, tr) {
    set = set.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(bpClear)) set = RangeSet.empty;
      else if (e.is(bpEffect)) {
        set = e.value.on ? set.update({ add: [bpMarker.range(e.value.pos)] }) : set.update({ filter: (from) => from !== e.value.pos });
      }
    }
    return set;
  },
});
function toggleBreakpoint(view: EditorView, pos: number) {
  let has = false;
  view.state.field(bpField).between(pos, pos, () => { has = true; });
  view.dispatch({ effects: bpEffect.of({ pos, on: !has }) });
  onBreakpointsChanged();
}
const bpGutter: Extension = [
  bpField,
  gutter({
    class: 'cm-breakpoint-gutter',
    markers: (v) => v.state.field(bpField),
    initialSpacer: () => bpMarker,
    domEventHandlers: {
      mousedown(view, line) { toggleBreakpoint(view, line.from); return true; },
    },
  }),
];

const themeSlot = new Compartment();
const isDark = () => document.documentElement.dataset.theme !== 'light';
const darkTheme = [
  oneDark,
  EditorView.theme({
    '&': { backgroundColor: 'var(--pg-pane-bg)' },
    '.cm-gutters': { backgroundColor: 'var(--pg-pane-bg)', borderRight: '1px solid var(--pg-line)' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.05)' },
  }, { dark: true }),
];
const lightTheme = EditorView.theme({ '.cm-gutters': { borderRight: '1px solid var(--pg-line)' } });

// ---------- state ----------

let view: EditorView;
let compiled: Compiled | null = null;
let compiledSrc = '';
let machine: Machine | null = null;
let busy = false;
let runToken = 0;
let selectedFrame = 0;
let activeTab = 'vars';
let hexAddr: number | null = null;
let prevValues = new Map<string, string>();
let prevStack = new Map<number, number>();
let lineColors = new Map<number, string>();
let compileTimer = 0;

const els = {
  status: $('pg-status'), asm: $('pg-asm'), inspect: $('pg-inspect'), out: $('pg-out'), exit: $('pg-exit'),
  fault: $('pg-fault'), stdin: $<HTMLTextAreaElement>('pg-stdin'), examples: $<HTMLSelectElement>('pg-examples'),
  asan: $<HTMLInputElement>('pg-asan'), addrs: $<HTMLInputElement>('pg-addrs'),
  run: $<HTMLButtonElement>('pg-run'), debug: $<HTMLButtonElement>('pg-debug'),
  cont: $<HTMLButtonElement>('pg-continue'), over: $<HTMLButtonElement>('pg-over'), into: $<HTMLButtonElement>('pg-into'),
  outBtn: $<HTMLButtonElement>('pg-stepout'), instr: $<HTMLButtonElement>('pg-instr'), stop: $<HTMLButtonElement>('pg-stop'),
  share: $<HTMLButtonElement>('pg-share'), godbolt: $<HTMLAnchorElement>('pg-godbolt'),
};

function setStatus(text: string, kind: '' | 'ok' | 'err' | 'paused' = '') {
  els.status.textContent = text;
  els.status.className = 'pg-status' + (kind ? ' ' + kind : '');
}

function updateButtons() {
  const paused = !!machine && machine.status === 'paused' && !busy;
  const live = !!machine && (machine.status === 'paused' || machine.status === 'ready' || busy);
  els.run.disabled = busy;
  els.debug.disabled = busy;
  for (const b of [els.cont, els.over, els.into, els.outBtn, els.instr]) b.disabled = !paused;
  els.stop.disabled = !live && !busy;
}

// ---------- compile & assembly view ----------

function lineColor(i: number) {
  const hue = (i * 47 + 200) % 360;
  return isDark() ? `hsla(${hue}, 70%, 60%, 0.13)` : `hsla(${hue}, 80%, 55%, 0.14)`;
}

function doCompile(): boolean {
  const src = view.state.doc.toString();
  if (compiled && src === compiledSrc) return true;
  const r = compile(src);
  compiledSrc = src;
  if (!r.ok) {
    compiled = null;
    view.dispatch({ effects: [errorLayer.set.of([{ line: r.error.line }]), colorLayer.set.of([])] });
    els.asm.innerHTML = `<div class="pg-empty">Compilation failed. Fix the error to see the assembly.</div>`;
    setStatus(`error: main.c:${r.error.line}:${r.error.col}: ${r.error.message}`, 'err');
    return false;
  }
  compiled = r.program;
  view.dispatch({ effects: errorLayer.set.of([]) });
  const lines = [...compiled.lineHasCode].sort((a, b) => a - b);
  lineColors = new Map(lines.map((l, i) => [l, lineColor(i)]));
  view.dispatch({ effects: colorLayer.set.of(lines.map((l) => ({ line: l, style: `background:${lineColors.get(l)}` }))) });
  renderAsm();
  const textSize = compiled.textEnd - compiled.textBase;
  setStatus(`Compiled: ${compiled.insts.length} instructions (${textSize} bytes of .text), ${compiled.strings.length} string literal(s), ${compiled.globals.length} global(s).`, 'ok');
  return true;
}

function colorizeAsm(text: string): string {
  const m = /^(\S+)(\s*)(.*)$/.exec(text);
  if (!m) return esc(text);
  const [, mn, sp, rest] = m;
  const ops = esc(rest)
    .replace(/\b(BYTE|WORD|DWORD|QWORD|PTR)\b/g, '<span class="k">$1</span>')
    .replace(/\b(r[a-ds][xip]|e[a-ds][xip]|[a-d][lx]|r[sd]il?|e?[sd]i|[sd]il|r(?:8|9|10|11)[dwb]?|[re]?[sb]p|[sb]pl|rip)\b/g, '<span class="r">$1</span>')
    .replace(/(^|[\s,[+-])(-?\d+)\b/g, '$1<span class="n">$2</span>')
    .replace(/(\.L[\w]+|\b(?:main|_start)\b)/g, '<span class="l">$1</span>');
  return `<span class="m">${esc(mn)}</span>${sp}${ops}`;
}

function renderAsm() {
  if (!compiled) return;
  const c = compiled;
  const parts: string[] = [];
  for (const row of c.listing) {
    if (row.kind === 'inst') {
      const ins = c.insts[row.idx!];
      const color = lineColors.get(ins.line);
      parts.push(`<div class="asm-row inst" data-idx="${row.idx}" data-line="${ins.line}"${color ? ` style="--c:${color}"` : ''}><span class="asm-addr">${ins.addr.toString(16)}</span><span class="asm-code">    ${colorizeAsm(ins.text)}</span></div>`);
    } else if (row.kind === 'label') {
      parts.push(`<div class="asm-row label"${row.line ? ` data-line="${row.line}"` : ''}><span class="asm-addr">${row.addr ? row.addr.toString(16) : ''}</span><span class="asm-code">${esc(row.text)}</span></div>`);
    } else if (row.kind === 'data') {
      const color = row.line ? lineColors.get(row.line) : undefined;
      parts.push(`<div class="asm-row data"${row.line ? ` data-line="${row.line}"` : ''}${color ? ` style="--c:${color}"` : ''}><span class="asm-addr"></span><span class="asm-code">    <span class="m">${esc(row.text.split(' ')[0])}</span> <span class="s">${esc(row.text.split(' ').slice(1).join(' '))}</span></span></div>`);
    } else {
      parts.push(`<div class="asm-row ${row.kind}"><span class="asm-addr"></span><span class="asm-code">    ${esc(row.text)}</span></div>`);
    }
  }
  els.asm.innerHTML = parts.join('');
  els.asm.classList.toggle('noaddr', !els.addrs.checked);
  markCurrentAsm();
}

function markCurrentAsm() {
  els.asm.querySelectorAll('.asm-row.current').forEach((r) => r.classList.remove('current'));
  if (!machine || (machine.status !== 'paused' && machine.status !== 'faulted')) return;
  const f = machine.frames()[selectedFrame];
  const idx = f ? f.idx : machine.rip;
  const row = els.asm.querySelector(`.asm-row[data-idx="${idx}"]`);
  if (row) {
    row.classList.add('current');
    (row as HTMLElement).scrollIntoView({ block: 'nearest' });
  }
}

let hoverLine = 0;
function setHover(line: number, fromAsm: boolean) {
  if (line === hoverLine) return;
  hoverLine = line;
  els.asm.querySelectorAll('.asm-row.hover').forEach((r) => r.classList.remove('hover'));
  if (line) els.asm.querySelectorAll(`.asm-row[data-line="${line}"]`).forEach((r) => r.classList.add('hover'));
  view.dispatch({ effects: hoverLayer.set.of(line && fromAsm ? [{ line }] : []) });
}

// ---------- running ----------

function breakpointLines(): Set<number> {
  const set = new Set<number>();
  const doc = view.state.doc;
  view.state.field(bpField).between(0, doc.length, (from) => { set.add(doc.lineAt(from).number); });
  if (!compiled) return set;
  // like gdb: a breakpoint on a line without code moves to the next line that has a statement
  const stmtLines = [...new Set(compiled.insts.filter((i) => i.stmt && i.fn !== '_start').map((i) => i.line))].sort((a, b) => a - b);
  const out = new Set<number>();
  for (const l of set) {
    const next = stmtLines.find((s) => s >= l);
    if (next !== undefined) out.add(next);
  }
  return out;
}
function onBreakpointsChanged() {
  try { localStorage.setItem(STORAGE_KEY + '-bp', JSON.stringify([...breakpointLines()])); } catch { /* ignore */ }
}

function resetOutput() {
  els.out.innerHTML = '';
  els.exit.textContent = '';
  els.fault.hidden = true;
  els.fault.innerHTML = '';
}

function renderOutput() {
  if (!machine) return;
  els.out.innerHTML = machine.out.map((o) => `<span${o.err ? ' class="err"' : ''}>${esc(o.text)}</span>`).join('');
  els.out.scrollTop = els.out.scrollHeight;
}

function start(debug: boolean): boolean {
  stopSession(false);
  if (!doCompile() || !compiled) return false;
  resetOutput();
  machine = new Machine(compiled, { stdin: els.stdin.value, sanitizer: els.asan.checked });
  selectedFrame = 0;
  prevValues = new Map();
  prevStack = new Map();
  hexAddr = null;
  void debug;
  return true;
}

async function drive(mode: RunMode) {
  if (!machine) return;
  const m = machine;
  busy = true;
  updateButtons();
  const token = ++runToken;
  const startDepth = m.depth;
  const bps = mode === 'run' ? new Set<number>() : breakpointLines();
  let why: StopReason = m.run(mode, bps, CHUNK, { startDepth });
  while (why === 'budget') {
    if (token !== runToken) return;
    if (m.steps > MAX_STEPS) {
      setStatus(`Stopped after ${MAX_STEPS.toLocaleString()} instructions. Is there an infinite loop? (Paused so you can inspect it.)`, 'err');
      m.status = 'paused';
      why = 'step';
      break;
    }
    setStatus(`Running… ${m.steps.toLocaleString()} instructions executed`);
    renderOutput();
    await new Promise((r) => setTimeout(r, 0));
    if (token !== runToken) return;
    why = m.run(mode, bps, CHUNK, { startDepth, resume: true });
  }
  busy = false;
  onStop(why, mode);
}

function onStop(why: StopReason, mode: RunMode) {
  const m = machine!;
  renderOutput();
  selectedFrame = 0;
  if (why === 'exit') {
    els.exit.textContent = `exit status ${m.exitCode} · ${m.steps.toLocaleString()} instructions`;
    const leaks = m.leaks.length ? ` LeakSanitizer found ${m.leaks.length} leaked block(s).` : '';
    setStatus(`Program exited with status ${m.exitCode} after ${m.steps.toLocaleString()} instructions.${leaks}`, m.exitCode === 0 && !leaks ? 'ok' : 'err');
    view.dispatch({ effects: [execLayer.set.of([]), frameLayer.set.of([])] });
  } else if (why === 'fault') {
    const f = m.fault!;
    const line = m.line;
    els.exit.textContent = `killed by ${f.signal} · ${m.steps.toLocaleString()} instructions`;
    els.fault.hidden = false;
    els.fault.innerHTML = `<strong>${esc(f.signal)}</strong> · <b>${esc(f.title)}</b><br>${esc(f.message)} <button class="pg-btn" id="pg-goto-fault">Show line ${line}</button>
      <div class="pg-sub" style="margin-top:4px">The debugger views show the program's state at the moment it crashed, like a core dump.</div>`;
    $('pg-goto-fault')?.addEventListener('click', () => revealLine(line));
    setStatus(`Crashed at line ${line}: ${f.title}`, 'err');
    view.dispatch({ effects: [execLayer.set.of([{ line }]), frameLayer.set.of([])] });
    revealLine(line);
  } else {
    const line = m.line;
    const fn = m.frames()[0]?.fn.name ?? '?';
    const what = why === 'breakpoint' ? 'Breakpoint hit' : mode === 'instr' ? 'Stepped one instruction' : 'Paused';
    setStatus(`${what} at line ${line} in ${fn}() · next instruction: ${m.inst?.text ?? ''}`, 'paused');
    view.dispatch({ effects: [execLayer.set.of([{ line }]), frameLayer.set.of([])] });
    revealLine(line);
  }
  updateButtons();
  renderInspector();
  markCurrentAsm();
}

function revealLine(line: number) {
  const doc = view.state.doc;
  if (line < 1 || line > doc.lines) return;
  view.dispatch({ effects: EditorView.scrollIntoView(doc.line(line).from, { y: 'nearest' }) });
}

function stopSession(message = true) {
  runToken++;
  busy = false;
  if (machine && message && machine.status !== 'exited' && machine.status !== 'faulted') setStatus('Stopped.', '');
  machine = null;
  view?.dispatch({ effects: [execLayer.set.of([]), frameLayer.set.of([])] });
  updateButtons();
  markCurrentAsm();
  renderInspector();
}

// ---------- inspector ----------

function renderInspector() {
  const body = els.inspect;
  if (!machine) {
    if (activeTab === 'memory' && compiled) { body.innerHTML = renderMemory(null); wireMemory(); return; }
    body.innerHTML = `<div class="pg-empty">${compiled ? 'Press <b>Debug</b> to stop at the start of <code>main</code> and inspect the program, or <b>Run</b> to execute it.' : 'Write a program to get started.'}<br><br>
      Tip: click left of a line number to set a breakpoint, then use <b>Continue</b>.</div>`;
    return;
  }
  switch (activeTab) {
    case 'vars': body.innerHTML = renderVars(); wireVars(); break;
    case 'stack': body.innerHTML = renderStack(); break;
    case 'memory': body.innerHTML = renderMemory(machine); wireMemory(); break;
    case 'heap': body.innerHTML = renderHeap(); wireHeap(); break;
    case 'regs': body.innerHTML = renderRegs(); break;
  }
}

function valueHtml(v: ValueView, key: string, depth: number): string {
  const prev = prevValues.get(key);
  const changed = prev !== undefined && prev !== v.value;
  prevValues.set(key, v.value);
  const head = `<span class="nm">${esc(v.name)}</span> <span class="ty">${esc(machine!.typeLabel(v.ty))}</span> = <span class="vv">${esc(v.value)}</span>${v.note ? ` <span class="note">${esc(v.note)}</span>` : ''}<span class="ad">${hex(v.addr)}</span>`;
  if (v.children && v.children.length) {
    const kids = v.children.map((c, i) => valueHtml(c, key + '/' + i, depth + 1)).join('');
    return `<details${depth === 0 && v.children.length <= 8 ? ' open' : ''}><summary class="row${changed ? ' changed' : ''}">${head}</summary><div class="kids">${kids}</div></details>`;
  }
  return `<div class="row leaf${changed ? ' changed' : ''}">${head}</div>`;
}

function renderVars(): string {
  const m = machine!;
  const frames = m.frames().filter((f) => f.fn.name !== '_start');
  if (selectedFrame >= frames.length) selectedFrame = 0;
  let h = '<div class="pg-h">Call stack</div><ul class="frames">';
  if (!frames.length) h += `<li class="pg-empty">${m.status === 'exited' ? 'Program has exited.' : 'No frames.'}</li>`;
  frames.forEach((f, i) => {
    const args = m.locals(f).filter((_, k) => f.fn.locals[k]?.isParam).map((v) => `${v.name}=${v.value.split(' ')[0]}`).join(', ');
    h += `<li data-frame="${i}" class="${i === selectedFrame ? 'sel' : ''}"><span><span class="fn">${esc(f.fn.name)}</span>(${esc(args)})</span><span class="ln">line ${f.line}</span></li>`;
  });
  h += '</ul>';
  if (m.backtraceCorrupt) h += `<div class="pg-empty">⚠ Backtrace stopped: a saved frame pointer or return address on the stack is corrupted, so the debugger cannot find the callers (gdb reports the same thing). This is what a stack buffer overflow does.</div>`;
  const f = frames[selectedFrame];
  if (f) {
    const locals = m.locals(f);
    h += `<div class="pg-h">Locals of ${esc(f.fn.name)}()${f.rbp !== null ? ` · rbp = ${hex(f.rbp)}` : ''}</div><div class="val">`;
    h += locals.length ? locals.map((v) => valueHtml(v, `${f.fn.name}#${f.depth}:${v.name}`, 0)).join('') : `<div class="pg-empty">${f.rbp === null ? 'The frame is being set up (prologue) or torn down (epilogue).' : 'No local variables.'}</div>`;
    h += '</div>';
  }
  const globals = m.globalViews();
  if (globals.length) {
    h += '<div class="pg-h">Globals and statics</div><div class="val">';
    h += globals.map(({ g, v }) => valueHtml({ ...v, note: (v.note ? v.note + ' · ' : '') + g.section }, 'g:' + g.label, 0)).join('');
    h += '</div>';
  }
  return h;
}

function wireVars() {
  els.inspect.querySelectorAll<HTMLLIElement>('.frames li[data-frame]').forEach((li) => {
    li.addEventListener('click', () => {
      selectedFrame = Number(li.dataset.frame);
      const f = machine!.frames().filter((x) => x.fn.name !== '_start')[selectedFrame];
      view.dispatch({ effects: frameLayer.set.of(selectedFrame > 0 && f ? [{ line: f.line }] : []) });
      if (f) revealLine(f.line);
      renderInspector();
      markCurrentAsm();
    });
  });
}

function bytesHex(addr: number, n: number): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const b = machine!.mem.peek(addr + i, 1);
    out.push(b === null ? '??' : b.toString(16).padStart(2, '0'));
  }
  return out.join(' ');
}

function renderStack(): string {
  const m = machine!;
  const rsp = m.regs[REG_NAMES.indexOf('rsp')];
  const rbpReg = m.regs[REG_NAMES.indexOf('rbp')];
  const frames = m.frames();
  const user = frames.filter((f) => f.fn.name !== '_start');
  if (!user.length) return `<div class="pg-empty">No active frames${m.status === 'exited' ? ': the program has exited' : ''}.</div>`;
  let h = `<div class="pg-sub" style="font-family:var(--font-sans);margin-bottom:6px">Higher addresses at the top; the stack grows <b>down</b>. Each row is 8 bytes, shown in memory order (little-endian).</div><table class="stk">`;
  const row = (addr: number, cls: string, note: string) => {
    const word = m.mem.peek(addr, 8);
    const prev = prevStack.get(addr);
    const chg = prev !== undefined && word !== null && prev !== word ? ' chg' : '';
    if (word !== null) prevStack.set(addr, word);
    const marks = [addr === rsp ? 'rsp →' : '', addr === rbpReg ? 'rbp →' : ''].filter(Boolean).join(' ');
    return `<tr class="${cls}${chg}"><td class="ptr">${marks}</td><td class="a">${hex(addr)}</td><td class="b">${bytesHex(addr, 8)}</td><td class="n">${note}</td></tr>`;
  };
  // argv area above main
  h += `<tr class="fh"><td></td><td colspan="3">process start: argv and environment</td></tr>`;
  const argv0 = m.mem.peek(m.argvAddr, 8) ?? 0;
  let progName = '';
  for (let i = 0; i < 32; i++) { const ch = m.mem.peek(argv0 + i, 1); if (!ch) break; progName += String.fromCharCode(ch); }
  h += row(m.argvAddr, '', `<b>argv[0]</b> → ${hex(argv0)} ${esc(JSON.stringify(progName))}`);
  for (let i = user.length - 1; i >= 0; i--) {
    const f = user[i];
    const callee = i > 0 ? user[i - 1] : null;
    const isCur = i === 0;
    // frame occupies [bottom, top): top = rbp + 16 (return address + saved rbp), bottom = callee's top or rsp
    let top: number, bottom: number;
    if (f.rbp !== null) top = f.rbp + 16;
    else top = rsp + (m.inst?.op === 'ret' || m.rip === f.fn.start ? 8 : 16);
    if (callee) bottom = callee.rbp !== null ? callee.rbp + 16 : rsp + 16;
    else bottom = rsp;
    const size = top - bottom;
    h += `<tr class="fh${isCur ? ' cur' : ''}"><td></td><td colspan="3">${esc(f.fn.name)}() · ${size} bytes · line ${f.line}${isCur ? ' · current' : ''}</td></tr>`;
    const vars = f.rbp !== null ? f.fn.locals.map((v) => ({ v, a: f.rbp! - v.offset, size: sizeOf(v.ty) })) : [];
    let collapsed = 0;
    for (let a = top - 8; a >= bottom; a -= 8) {
      if (f.rbp !== null && a === f.rbp + 8) { h += row(a, 'ret', `<b>return address</b> → ${esc(m.symbolize(m.mem.peek(a, 8) ?? 0))}`); continue; }
      if (f.rbp !== null && a === f.rbp) { h += row(a, 'sav', `<b>saved rbp</b> (caller's frame pointer)`); continue; }
      if (f.rbp === null && a === top - 8) { h += row(a, 'ret', `<b>return address</b> → ${esc(m.symbolize(m.mem.peek(a, 8) ?? 0))}`); continue; }
      const hits = vars.filter((x) => x.a < a + 8 && x.a + x.size > a);
      if (hits.length) {
        // collapse long runs inside one big variable
        const only = hits.length === 1 ? hits[0] : null;
        if (only && only.size > 48 && a < only.a + only.size - 16 && a >= only.a + 16) {
          collapsed++;
          if (a - 8 >= only.a + 16) continue;
          h += `<tr class="gap"><td></td><td colspan="3">… ${collapsed} more rows of ${esc(only.v.name)} …</td></tr>`;
          collapsed = 0;
          continue;
        }
        const note = hits.map((x) => {
          const off = a - x.a;
          const label = x.size > 8 || off !== 0 ? `${x.v.name}${x.size > 8 ? ` [bytes ${Math.max(0, off)}..${Math.min(x.size, off + 8) - 1}]` : ''}` : x.v.name;
          const val = x.size <= 8 && x.a >= a ? ' = ' + esc(m.view(x.v.name, x.a, x.v.ty).value) : '';
          return `<b>${esc(label)}</b>${val}`;
        }).join(', ');
        h += row(a, 'var', note);
        continue;
      }
      const lowest = vars.length ? Math.min(...vars.map((x) => x.a)) : (f.rbp ?? top);
      h += row(a, '', a < lowest && isCur ? 'pushed temporary / call arguments' : 'unused (padding or alignment)');
    }
  }
  h += '</table>';
  if (m.backtraceCorrupt) h += `<div class="pg-empty">⚠ The frames above this one cannot be shown: the saved rbp / return address were overwritten.</div>`;
  return h;
}
function renderMemory(m: Machine | null): string {
  const c = compiled!;
  const rsp = m ? m.regs[REG_NAMES.indexOf('rsp')] : STACK_TOP - 112;
  const heapStart = m ? m.heapStart : Math.ceil(c.bssEnd / 0x1000) * 0x1000 + 0x1000;
  const brk = m ? m.brk : heapStart;
  const seg = (name: string, color: string, start: number, end: number, perms: string, desc: string, extra = '') =>
    `<div class="mseg" style="--seg:${color}" data-addr="${start}"><span class="nm">${name} <span class="pg-sub">${perms}</span></span><span class="rg">${hex(start)} – ${hex(end)}<br>${(end - start).toLocaleString()} bytes</span><span class="ds">${desc}</span>${extra}</div>`;
  const blocks = m ? m.mem.blocks : [];
  const blockBar = blocks.length
    ? `<div class="blocks">${blocks.map((b) => `<span class="blk${b.freed ? ' freed' : ''}" title="#${b.id}: ${b.size} bytes${b.freed ? ' (freed)' : ''}" style="width:${Math.min(60, 8 + Math.sqrt(b.size) * 2)}px"></span>`).join('')}</div>` : '';
  let h = '<div class="pg-h">Address space (not to scale)</div><div class="mmap">';
  h += seg('[stack]', '#ffb86b', rsp, STACK_TOP, 'rw-', `Locals, saved registers and return addresses. Grows <b>down</b> from ${hex(STACK_TOP)}; rsp is at the bottom of the used part.`);
  h += `<div class="mgap">↓ free space: ${((rsp - brk) / 2 ** 40).toFixed(1)} TiB of unmapped addresses ↑</div>`;
  h += seg('[heap]', '#7ee2b8', heapStart, Math.max(brk, heapStart), 'rw-', `malloc'd blocks${blocks.length ? ` (${blocks.filter((b) => !b.freed).length} live, ${blocks.filter((b) => b.freed).length} freed)` : ' (none yet)'}. Grows <b>up</b> as the program break (brk) moves.`, blockBar);
  h += `<div class="mgap">gap</div>`;
  h += seg('.bss', '#c9a2ff', c.bssBase, c.bssEnd, 'rw-', `Uninitialized globals and statics: ${c.globals.filter((g) => g.section === '.bss').map((g) => esc(g.name)).join(', ') || 'none'}. Zeroed at startup; takes no space in the executable file.`);
  h += seg('.data', '#ff9eb7', c.dataBase, c.dataEnd, 'rw-', `Initialized globals and statics: ${c.globals.filter((g) => g.section === '.data').map((g) => esc(g.name)).join(', ') || 'none'}.`);
  h += seg('.rodata', '#f2c97d', c.rodataBase, c.rodataEnd, 'r--', `Read-only data: ${c.strings.length} string literal(s). Writing here crashes.`);
  h += seg('.text', '#8cb4ff', c.textBase, c.textEnd, 'r-x', `Machine code: ${c.insts.length} instructions in ${c.funcs.length - 1} function(s) plus _start.`);
  h += `<div class="mgap">unmapped</div>`;
  h += `<div class="mseg mnull" data-addr="0"><span class="nm">NULL page</span><span class="rg">0x0 – 0x1000</span><span class="ds">Never mapped, so dereferencing a NULL pointer crashes immediately (SIGSEGV).</span></div>`;
  h += '</div>';
  const text = c.textEnd - c.textBase, data = c.dataEnd - c.dataBase + (c.rodataEnd - c.rodataBase), bss = c.bssEnd - c.bssBase;
  h += `<div class="pg-h">$ size a.out</div><table class="sizes"><tr><th>text</th><th>data</th><th>bss</th><th>dec</th><th>hex</th></tr><tr><td>${text}</td><td>${data}</td><td>${bss}</td><td>${text + data + bss}</td><td>${(text + data + bss).toString(16)}</td></tr></table>`;
  if (m) {
    const addr = hexAddr ?? (m.lastWrite?.addr ?? rsp);
    h += `<div class="pg-h">Hex dump</div><div class="hexctl">address <input id="pg-hexaddr" value="${hex(addr)}" spellcheck="false"> <button class="pg-btn" id="pg-hexgo">Go</button> <span>highlighted bytes were written by the last step</span></div>`;
    h += hexDump(m, Math.floor(addr / 16) * 16, 16);
  } else {
    h += `<div class="pg-empty">Start the program to explore its memory byte by byte.</div>`;
  }
  return h;
}

function hexDump(m: Machine, start: number, rows: number): string {
  let h = '<table class="hex">';
  const lw = m.lastWrite;
  for (let r = 0; r < rows; r++) {
    const a = start + r * 16;
    let bytes = '', ascii = '';
    for (let i = 0; i < 16; i++) {
      const b = m.mem.peek(a + i, 1);
      const written = lw && a + i >= lw.addr && a + i < lw.addr + lw.size;
      if (b === null) { bytes += `<span class="u">··</span> `; ascii += ' '; continue; }
      bytes += `<span class="${written ? 'w' : b === 0 ? 'z' : ''}">${b.toString(16).padStart(2, '0')}</span>${i === 7 ? '  ' : ' '}`;
      ascii += b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : '.';
    }
    h += `<tr><td class="a">${hex(a)}</td><td>${bytes}</td><td class="asc">${ascii}</td><td class="sym">${esc(m.symbolize(a))}</td></tr>`;
  }
  return h + '</table>';
}

function wireMemory() {
  els.inspect.querySelectorAll<HTMLElement>('.mseg[data-addr]').forEach((s) => {
    s.addEventListener('click', () => { if (!machine) return; hexAddr = Number(s.dataset.addr); renderInspector(); });
  });
  const go = () => {
    const v = ($('pg-hexaddr') as HTMLInputElement).value.trim();
    const n = /^0x/i.test(v) ? parseInt(v, 16) : parseInt(v, 10);
    if (!isNaN(n)) { hexAddr = n; renderInspector(); }
  };
  $('pg-hexgo')?.addEventListener('click', go);
  $('pg-hexaddr')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

function renderHeap(): string {
  const m = machine!;
  const blocks = m.mem.blocks;
  if (!blocks.length) return `<div class="pg-empty">No heap allocations yet. Blocks appear here when the program calls malloc, calloc or realloc.</div>`;
  const live = blocks.filter((b) => !b.freed), freed = blocks.filter((b) => b.freed);
  const exited = m.status === 'exited';
  let h = `<div class="pg-sub" style="font-family:var(--font-sans);margin-bottom:6px">${live.length} live block(s), ${live.reduce((s, b) => s + b.size, 0)} bytes in use · ${freed.length} freed · program break at ${hex(m.brk)}. Each block is preceded by a 16-byte header (size and flags), as in glibc.</div>`;
  h += '<table class="heapt"><tr><th>#</th><th>address</th><th>size</th><th>status</th><th>malloc</th><th>free</th></tr>';
  for (const b of blocks) {
    const st = b.freed ? '<span class="st-freed">freed</span>' : exited ? '<span class="st-leak">LEAKED</span>' : '<span class="st-live">live</span>';
    h += `<tr data-addr="${b.addr}"><td>${b.id}</td><td>${hex(b.addr)}</td><td>${b.size}</td><td>${st}</td><td>line ${b.allocLine}</td><td>${b.freeLine ? 'line ' + b.freeLine : ''}</td></tr>`;
  }
  return h + '</table><div class="pg-sub" style="font-family:var(--font-sans);margin-top:6px">Click a block to see its bytes in the Memory tab.</div>';
}
function wireHeap() {
  els.inspect.querySelectorAll<HTMLTableRowElement>('.heapt tr[data-addr]').forEach((tr) => {
    tr.addEventListener('click', () => { hexAddr = Number(tr.dataset.addr) - 16; switchTab('memory'); });
  });
}

function renderRegs(): string {
  const m = machine!;
  const shown = ['rax', 'rcx', 'rdx', 'rsi', 'rdi', 'r8', 'r9', 'rsp', 'rbp'];
  const role: Record<string, string> = {
    rax: 'return value / scratch', rcx: '4th argument / scratch', rdx: '3rd argument', rsi: '2nd argument', rdi: '1st argument',
    r8: '5th argument', r9: '6th argument', rsp: 'stack pointer (top of stack)', rbp: 'frame pointer (base of current frame)',
  };
  let h = '<table class="regs"><tr><th>reg</th><th>hex</th><th>signed</th><th>meaning</th></tr>';
  const ins = m.inst;
  h += `<tr><td class="rn">rip</td><td>${ins ? hex(ins.addr) : '—'}</td><td></td><td class="note">instruction pointer → <code>${ins ? esc(ins.text) : ''}</code> ${ins ? esc(m.symbolize(ins.addr)) : ''}</td></tr>`;
  for (const n of shown) {
    const i = REG_NAMES.indexOf(n as typeof REG_NAMES[number]);
    const v = m.regs[i];
    const sym = Math.abs(v) > 0x1000 ? m.symbolize(v) : '';
    h += `<tr class="${m.changedRegs.has(i) ? 'chg' : ''}"><td class="rn">${n}</td><td>${hex(v)}</td><td>${v >= 2 ** 31 && v < 2 ** 32 ? `${v} / ${v | 0}` : v}</td><td class="note">${role[n]}${sym ? ' · ' + esc(sym) : ''}</td></tr>`;
  }
  h += '</table>';
  if (m.flags) {
    const { a, b, size } = m.flags;
    h += `<div class="flagbox">Flags come from the last <code>cmp</code>: compared ${size * 8}-bit values <code>${a}</code> and <code>${b}</code>. Conditional jumps and <code>set</code>* instructions read the result.</div>`;
  }
  h += `<div class="flagbox">Highlighted registers changed during the last step. Values in eax-style 32-bit registers are zero-extended into the full 64-bit register, as on real hardware.</div>`;
  return h;
}

function switchTab(tab: string) {
  activeTab = tab;
  document.querySelectorAll<HTMLButtonElement>('.pg-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  renderInspector();
}

// ---------- sharing ----------

function encode(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function godboltUrl(code: string) {
  const state = { sessions: [{ id: 1, language: 'c', source: code, compilers: [{ id: 'cg142', options: '-O0 -masm=intel' }] }] };
  return 'https://godbolt.org/clientstate/' + encode(JSON.stringify(state));
}

// ---------- setup ----------

function loadExample(id: string) {
  const ex = EXAMPLES.find((e) => e.id === id);
  if (!ex) return;
  stopSession(false);
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: ex.code }, effects: bpClear.of(null) });
  const doc = view.state.doc;
  view.dispatch({ effects: (ex.breakpoints ?? []).filter((l) => l <= doc.lines).map((l) => bpEffect.of({ pos: doc.line(l).from, on: true })) });
  els.stdin.value = ex.stdin ?? '';
  resetOutput();
  doCompile();
  setStatus(ex.hint, 'ok');
  renderInspector();
}

function init() {
  // initial code: shared link > last session > first example
  let code = EXAMPLES[0].code;
  let fromHash = false;
  const m = /#code=([\w-]+)/.exec(location.hash);
  if (m) { try { code = decode(m[1]); fromHash = true; } catch { /* ignore */ } }
  else { try { code = localStorage.getItem(STORAGE_KEY) ?? code; } catch { /* ignore */ } }

  view = new EditorView({
    parent: $('pg-editor'),
    state: EditorState.create({
      doc: code,
      extensions: [
        bpGutter,
        basicSetup,
        cpp(),
        themeSlot.of(isDark() ? darkTheme : lightTheme),
        colorLayer.field, frameLayer.field, execLayer.field, errorLayer.field, hoverLayer.field,
        keymap.of([
          { key: 'Mod-Enter', run: () => { void runProgram(); return true; } },
          { key: 'Mod-s', run: () => { share(); return true; } },
        ]),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          if (machine) { stopSession(false); setStatus('Code changed: the debug session ended. Run or Debug again.'); }
          clearTimeout(compileTimer);
          compileTimer = window.setTimeout(() => {
            doCompile();
            renderInspector();
            try { localStorage.setItem(STORAGE_KEY, view.state.doc.toString()); } catch { /* ignore */ }
          }, 350);
        }),
        EditorView.domEventHandlers({
          mousemove(e, v) {
            const pos = v.posAtCoords({ x: e.clientX, y: e.clientY });
            setHover(pos === null ? 0 : v.state.doc.lineAt(pos).number, false);
          },
          mouseleave() { setHover(0, false); },
        }),
      ],
    }),
  });

  els.examples.innerHTML = `<option value="">Examples…</option>` + EXAMPLES.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
  els.examples.addEventListener('change', () => { if (els.examples.value) loadExample(els.examples.value); els.examples.value = ''; });

  els.run.addEventListener('click', () => void runProgram());
  els.debug.addEventListener('click', () => void debugProgram());
  els.cont.addEventListener('click', () => void drive('continue'));
  els.over.addEventListener('click', () => void drive('over'));
  els.into.addEventListener('click', () => void drive('into'));
  els.outBtn.addEventListener('click', () => void drive('out'));
  els.instr.addEventListener('click', () => void drive('instr'));
  els.stop.addEventListener('click', () => stopSession(true));
  els.share.addEventListener('click', share);
  els.godbolt.addEventListener('click', () => { els.godbolt.href = godboltUrl(view.state.doc.toString()); });
  els.godbolt.href = godboltUrl(code);
  els.addrs.addEventListener('change', () => els.asm.classList.toggle('noaddr', !els.addrs.checked));
  document.querySelectorAll<HTMLButtonElement>('.pg-tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab!)));

  els.asm.addEventListener('mouseover', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.asm-row[data-line]');
    setHover(row ? Number(row.dataset.line) : 0, true);
  });
  els.asm.addEventListener('mouseleave', () => setHover(0, true));
  els.asm.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.asm-row[data-line]');
    if (row && Number(row.dataset.line) > 0) revealLine(Number(row.dataset.line));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' && e.shiftKey) { e.preventDefault(); stopSession(true); }
    else if (e.key === 'F5') { e.preventDefault(); if (machine?.status === 'paused') void drive('continue'); else void debugProgram(); }
    else if (e.key === 'F8') { e.preventDefault(); if (machine?.status === 'paused') void drive('continue'); }
    else if (e.key === 'F9') { e.preventDefault(); if (machine?.status === 'paused') void drive('instr'); }
    else if (e.key === 'F10') { e.preventDefault(); if (machine?.status === 'paused') void drive('over'); }
    else if (e.key === 'F11') { e.preventDefault(); if (machine?.status === 'paused') void drive(e.shiftKey ? 'out' : 'into'); }
  });

  // follow the site theme
  new MutationObserver(() => {
    view.dispatch({ effects: themeSlot.reconfigure(isDark() ? darkTheme : lightTheme) });
    if (compiled) {
      const lines = [...compiled.lineHasCode].sort((a, b) => a - b);
      lineColors = new Map(lines.map((l, i) => [l, lineColor(i)]));
      view.dispatch({ effects: colorLayer.set.of(lines.map((l) => ({ line: l, style: `background:${lineColors.get(l)}` }))) });
      renderAsm();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // restore breakpoints for the last session
  if (!fromHash) {
    try {
      const bps = JSON.parse(localStorage.getItem(STORAGE_KEY + '-bp') ?? '[]') as number[];
      const doc = view.state.doc;
      view.dispatch({ effects: bps.filter((l) => l >= 1 && l <= doc.lines).map((l) => bpEffect.of({ pos: doc.line(l).from, on: true })) });
    } catch { /* ignore */ }
  }

  doCompile();
  updateButtons();
  renderInspector();
  if (fromHash) setStatus('Loaded code from a shared link.', 'ok');
}

async function runProgram() {
  if (!start(false)) return;
  setStatus('Running…');
  await drive('run');
}

async function debugProgram() {
  if (!start(true)) return;
  setStatus('Starting the debugger…');
  await drive('into');
}

function share() {
  const url = `${location.origin}${location.pathname}#code=${encode(view.state.doc.toString())}`;
  history.replaceState(null, '', url);
  navigator.clipboard?.writeText(url).then(
    () => setStatus('Link copied to the clipboard. Anyone opening it gets this code.', 'ok'),
    () => setStatus('The link is in the address bar; copy it from there.', 'ok'),
  );
}

init();
