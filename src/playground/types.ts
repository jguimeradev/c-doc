// C types for the TinyC simulator (an LP64 target, like x86-64 Linux).

export type IntKind = 'char' | 'short' | 'int' | 'long';

export type CType =
  | { k: 'void' }
  | { k: IntKind; uns: boolean }
  | { k: 'ptr'; to: CType }
  | { k: 'array'; of: CType; len: number }
  | { k: 'struct'; tag: string; members: Member[]; size: number; align: number; complete: boolean }
  | { k: 'func'; ret: CType; params: CType[]; variadic: boolean };

export interface Member {
  name: string;
  ty: CType;
  offset: number;
}

export const VOID: CType = { k: 'void' };
export const CHAR: CType = { k: 'char', uns: false };
export const UCHAR: CType = { k: 'char', uns: true };
export const SHORT: CType = { k: 'short', uns: false };
export const INT: CType = { k: 'int', uns: false };
export const UINT: CType = { k: 'int', uns: true };
export const LONG: CType = { k: 'long', uns: false };
export const ULONG: CType = { k: 'long', uns: true };

export const ptrTo = (to: CType): CType => ({ k: 'ptr', to });
export const arrayOf = (of: CType, len: number): CType => ({ k: 'array', of, len });

export function isInteger(t: CType): boolean {
  return t.k === 'char' || t.k === 'short' || t.k === 'int' || t.k === 'long';
}

export function isPointerLike(t: CType): boolean {
  return t.k === 'ptr' || t.k === 'array';
}

export function isScalar(t: CType): boolean {
  return isInteger(t) || t.k === 'ptr';
}

export function isUnsigned(t: CType): boolean {
  return isInteger(t) ? (t as { uns: boolean }).uns : t.k === 'ptr';
}

export function sizeOf(t: CType): number {
  switch (t.k) {
    case 'void': return 1;
    case 'char': return 1;
    case 'short': return 2;
    case 'int': return 4;
    case 'long': return 8;
    case 'ptr': return 8;
    case 'array': return sizeOf(t.of) * t.len;
    case 'struct': return t.size;
    case 'func': return 1;
  }
}

export function alignOf(t: CType): number {
  switch (t.k) {
    case 'array': return alignOf(t.of);
    case 'struct': return t.align;
    case 'void':
    case 'func': return 1;
    default: return sizeOf(t);
  }
}

/** The element type a pointer or array points to. */
export function baseOf(t: CType): CType | null {
  if (t.k === 'ptr') return t.to;
  if (t.k === 'array') return t.of;
  return null;
}

export function sameType(a: CType, b: CType): boolean {
  if (a.k !== b.k) return false;
  switch (a.k) {
    case 'ptr': return sameType(a.to, (b as typeof a).to);
    case 'array': return a.len === (b as typeof a).len && sameType(a.of, (b as typeof a).of);
    case 'struct': return a === b;
    case 'func': return true;
    case 'void': return true;
    default: return (a as { uns: boolean }).uns === (b as { uns: boolean }).uns;
  }
}

/** Integer promotion: char and short become int. */
export function promote(t: CType): CType {
  if (t.k === 'char' || t.k === 'short') return INT;
  return t;
}

/** The usual arithmetic conversions for two integer operands. */
export function commonType(a: CType, b: CType): CType {
  const pa = promote(a), pb = promote(b);
  const long = pa.k === 'long' || pb.k === 'long';
  const ra = long ? 'long' : 'int';
  const uns =
    (pa.k === ra && (pa as { uns: boolean }).uns) || (pb.k === ra && (pb as { uns: boolean }).uns);
  return { k: ra, uns } as CType;
}

export function typeName(t: CType): string {
  switch (t.k) {
    case 'void': return 'void';
    case 'char': case 'short': case 'int': case 'long':
      return (t.uns ? 'unsigned ' : '') + t.k;
    case 'ptr':
      return t.to.k === 'func' ? 'function pointer' : typeName(t.to) + ' *';
    case 'array': return `${typeName(t.of)}[${t.len}]`;
    case 'struct': return `struct ${t.tag}`;
    case 'func': return `${typeName(t.ret)} (${t.params.map(typeName).join(', ')}${t.variadic ? ', ...' : ''})`;
  }
}
