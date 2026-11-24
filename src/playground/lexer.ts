// Tokenizer and a tiny preprocessor (#include is accepted, object-like #define is expanded).

export type TokKind = 'num' | 'char' | 'str' | 'id' | 'kw' | 'op' | 'eof';

export interface Token {
  k: TokKind;
  v: string;        // source text (for str: the decoded string)
  num?: number;     // numeric value for num/char
  suffix?: string;  // 'u', 'l', 'ul'... for integer literals
  line: number;
  col: number;
  pos: number;      // offset in the source, used to recover expression text
}

export class CompileError extends Error {
  line: number;
  col: number;
  constructor(msg: string, line: number, col: number) {
    super(msg);
    this.line = line;
    this.col = col;
  }
}

const KEYWORDS = new Set([
  'int', 'char', 'void', 'long', 'short', 'unsigned', 'signed', 'struct', 'union', 'enum', 'typedef',
  'return', 'if', 'else', 'while', 'for', 'do', 'break', 'continue', 'sizeof', 'switch', 'case',
  'default', 'const', 'static', 'extern', 'volatile', 'register', 'inline', 'goto', 'float', 'double',
  '_Bool', 'bool', 'restrict',
]);

const OPS = [
  '...', '<<=', '>>=', '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  '+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '=', '<', '>', '?', ':', ';', ',', '.',
  '(', ')', '[', ']', '{', '}',
];

/** Macros every program gets, standing in for the standard headers. */
const PREDEFINED: Record<string, string> = {
  NULL: '((void*)0)',
  true: '1',
  false: '0',
  EOF: '(-1)',
  EXIT_SUCCESS: '0',
  EXIT_FAILURE: '1',
  RAND_MAX: '2147483647',
  INT_MAX: '2147483647',
  INT_MIN: '(-2147483647-1)',
  UINT_MAX: '4294967295u',
  CHAR_BIT: '8',
  CHAR_MAX: '127',
  CHAR_MIN: '(-128)',
  SHRT_MAX: '32767',
  SHRT_MIN: '(-32768)',
  USHRT_MAX: '65535',
  SCHAR_MAX: '127',
  SCHAR_MIN: '(-128)',
  UCHAR_MAX: '255',
  // 64-bit limits exceed what the simulator represents exactly; using them gives a clear error
  LONG_MAX: '9223372036854775807L',
  LONG_MIN: '(-9223372036854775807L-1)',
  ULONG_MAX: '18446744073709551615UL',
  LLONG_MAX: '9223372036854775807LL',
  LLONG_MIN: '(-9223372036854775807LL-1)',
  ULLONG_MAX: '18446744073709551615ULL',
};

function decodeEscape(src: string, i: number, line: number, col: number): [number, number] {
  // src[i] is the character after the backslash; returns [code, next index]
  const c = src[i];
  const simple: Record<string, number> = { n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11, '?': 63 };
  if (c === 'x') {
    let j = i + 1, v = 0;
    while (j < src.length && /[0-9a-fA-F]/.test(src[j])) v = v * 16 + parseInt(src[j++], 16);
    if (j === i + 1) throw new CompileError('\\x used with no following hex digits', line, col);
    return [v & 0xff, j];
  }
  if (c >= '0' && c <= '7') {
    let j = i, v = 0;
    while (j < i + 3 && src[j] >= '0' && src[j] <= '7') v = v * 8 + (src.charCodeAt(j++) - 48);
    return [v & 0xff, j];
  }
  if (c in simple) return [simple[c], i + 1];
  throw new CompileError(`unknown escape sequence '\\${c}'`, line, col);
}

export interface LexResult {
  tokens: Token[];
  includes: string[];
}

export function tokenize(src: string): LexResult {
  const raw: Token[] = [];
  const includes: string[] = [];
  const macros = new Map<string, Token[] | string>();   // string = predefined body, tokenized on use
  let i = 0, line = 1, lineStart = 0;
  let atLineStart = true;

  const col = () => i - lineStart + 1;

  for (const [name, body] of Object.entries(PREDEFINED)) macros.set(name, body);

  function tokenizeRange(s: string, from: number, to: number, ln: number, lnStart: number, posBase: number): Token[] {
    const out: Token[] = [];
    let j = from;
    while (j < to) {
      const c = s[j];
      if (c === ' ' || c === '\t' || c === '\r') { j++; continue; }
      const start = j;
      const cc = start - lnStart + 1;
      if (/[0-9]/.test(c)) {
        let m = /^(0[xX][0-9a-fA-F]+|[0-9]+)([uUlL]*)/.exec(s.slice(j, to))!;
        const after = s[j + m[0].length];
        if (after === '.' || after === 'e' || after === 'E' || after === 'f') {
          throw new CompileError('floating-point numbers are not supported by the simulator (integers, chars and pointers only)', ln, cc);
        }
        const body = m[1];
        const val = /^0[xX]/.test(body) ? parseInt(body, 16) : body.length > 1 && body[0] === '0' ? parseInt(body, 8) : parseInt(body, 10);
        if (val > Number.MAX_SAFE_INTEGER) {
          throw new CompileError(`integer constant ${body} is too large for the simulator: 64-bit values are exact only up to 2^53 (9007199254740991)`, ln, cc);
        }
        out.push({ k: 'num', v: m[0], num: val, suffix: m[2].toLowerCase(), line: ln, col: cc, pos: posBase + start });
        j += m[0].length;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let e = j;
        while (e < to && /[A-Za-z0-9_]/.test(s[e])) e++;
        const word = s.slice(j, e);
        out.push({ k: KEYWORDS.has(word) ? 'kw' : 'id', v: word, line: ln, col: cc, pos: posBase + start });
        j = e;
        continue;
      }
      if (c === "'") {
        let k = j + 1, v: number;
        if (s[k] === '\\') [v, k] = decodeEscape(s, k + 1, ln, cc);
        else v = s.charCodeAt(k++);
        if (s[k] !== "'") throw new CompileError('unterminated character constant', ln, cc);
        out.push({ k: 'char', v: s.slice(j, k + 1), num: v > 127 ? v - 256 : v, line: ln, col: cc, pos: posBase + start });
        j = k + 1;
        continue;
      }
      if (c === '"') {
        let k = j + 1, str = '';
        while (k < to && s[k] !== '"') {
          if (s[k] === '\n') throw new CompileError('missing terminating " character', ln, cc);
          if (s[k] === '\\') {
            const [v, n] = decodeEscape(s, k + 1, ln, cc);
            str += String.fromCharCode(v);
            k = n;
          } else str += s[k++];
        }
        if (k >= to) throw new CompileError('missing terminating " character', ln, cc);
        out.push({ k: 'str', v: str, line: ln, col: cc, pos: posBase + start });
        j = k + 1;
        continue;
      }
      const op = OPS.find((o) => s.startsWith(o, j));
      if (!op) throw new CompileError(`stray '${c}' in program`, ln, cc);
      out.push({ k: 'op', v: op, line: ln, col: cc, pos: posBase + start });
      j += op.length;
    }
    return out;
  }

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { i++; line++; lineStart = i; atLineStart = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (src.startsWith('/*', i)) {
      const startLine = line, startCol = col();
      i += 2;
      while (i < src.length && !src.startsWith('*/', i)) {
        if (src[i] === '\n') { line++; lineStart = i + 1; }
        i++;
      }
      if (i >= src.length) throw new CompileError('unterminated comment', startLine, startCol);
      i += 2;
      continue;
    }
    if (c === '#' && atLineStart) {
      // preprocessor directive: read to end of line (with backslash continuation)
      let end = i;
      while (end < src.length && src[end] !== '\n') {
        if (src[end] === '\\' && src[end + 1] === '\n') end += 2; else end++;
      }
      const text = src.slice(i + 1, end).replace(/\\\n/g, ' ');
      const dcol = col();
      const m = /^\s*(\w+)\s*(.*)$/s.exec(text);
      if (m) {
        const [, dir, rest] = m;
        if (dir === 'include') {
          includes.push(rest.trim());
        } else if (dir === 'define') {
          const dm = /^([A-Za-z_]\w*)(\()?/.exec(rest);
          if (!dm) throw new CompileError('macro names must be identifiers', line, dcol);
          if (dm[2]) throw new CompileError('function-like macros are not supported by the simulator; use a function instead', line, dcol);
          const bodyStart = i + 1 + text.indexOf(dm[1]) + dm[1].length;
          macros.set(dm[1], tokenizeRange(src, bodyStart, end, line, lineStart, 0).map((t) => ({ ...t, pos: -1 })));
        } else if (dir === 'undef') {
          macros.delete(rest.trim());
        } else if (dir === 'pragma') {
          // ignored
        } else {
          throw new CompileError(`#${dir} is not supported by the simulator`, line, dcol);
        }
      }
      // account for continued lines
      for (let k = i; k < end; k++) if (src[k] === '\n') { line++; lineStart = k + 1; }
      i = end;
      continue;
    }
    atLineStart = false;
    // tokenize one token at a time using the range tokenizer on the current line remainder
    let lineEnd = i;
    while (lineEnd < src.length && src[lineEnd] !== '\n' && !src.startsWith('//', lineEnd) && !src.startsWith('/*', lineEnd)) {
      if (src[lineEnd] === '"' || src[lineEnd] === "'") {
        // skip over quoted text so comment markers inside strings are not misread
        const q = src[lineEnd];
        lineEnd++;
        while (lineEnd < src.length && src[lineEnd] !== q && src[lineEnd] !== '\n') {
          if (src[lineEnd] === '\\') lineEnd++;
          lineEnd++;
        }
        if (src[lineEnd] === q) lineEnd++;
        continue;
      }
      lineEnd++;
    }
    raw.push(...tokenizeRange(src, i, lineEnd, line, lineStart, 0));
    i = lineEnd;
  }

  // Expand object-like macros.
  const tokens: Token[] = [];
  const expand = (t: Token, depth: Set<string>) => {
    if (t.k === 'id' && macros.has(t.v) && !depth.has(t.v)) {
      const next = new Set(depth).add(t.v);
      let body = macros.get(t.v)!;
      if (typeof body === 'string') {
        try {
          body = tokenizeRange(body, 0, body.length, t.line, 0, 0);
        } catch (e) {
          if (e instanceof CompileError) throw new CompileError(`${t.v}: ${e.message}`, t.line, t.col);
          throw e;
        }
      }
      for (const m of body) expand({ ...m, line: t.line, col: t.col, pos: t.pos }, next);
    } else tokens.push(t);
  };
  for (const t of raw) expand(t, new Set());
  tokens.push({ k: 'eof', v: '<end of file>', line, col: col(), pos: src.length });
  return { tokens, includes };
}
