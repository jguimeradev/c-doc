// Adds a "Try it" button to C code blocks that the in-browser simulator can compile.

const blocks = [...document.querySelectorAll<HTMLPreElement>('pre.astro-code[data-language="c"]')]
  .filter((pre) => /\bmain\s*\(/.test(pre.textContent ?? ''));

function encode(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function decorate() {
  const { compile } = await import('./index.ts');
  for (const pre of blocks) {
    const code = (pre.textContent ?? '').replace(/\n?$/, '\n');
    if (!compile(code).ok) continue;      // only offer programs the simulator can run
    const wrap = document.createElement('div');
    wrap.className = 'tryit-wrap';
    pre.parentNode!.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const a = document.createElement('a');
    a.className = 'tryit';
    a.href = `/playground/#code=${encode(code)}`;
    a.textContent = '▶ Try it';
    a.title = 'Open this program in the C playground: run it, debug it, see its assembly and memory';
    wrap.appendChild(a);
  }
}

if (blocks.length) {
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
  idle(() => { void decorate(); });
}
