# c-doc

A rustdoc-style site for C, built with Astro. Two parts:

- **The C Book** (`src/content/book/`): a tutorial whose chapters follow the structure of
  Kernighan & Ritchie's *The C Programming Language* (2nd ed.). Text and examples are
  original and updated for C99–C23; no text from the book is reproduced.
- **Exercises** (`src/content/exercises/<chapter-id>.md`): 51 exercises with difficulty,
  hints and solutions, at `/book/<chapter>/exercises/`.
- **Projects** (`src/content/projects/`): 9 multi-chapter projects with specs, milestones,
  starter code, test plans and stretch goals, at `/projects/`.
- **Playground** (`/playground/`, code in `src/playground/`): compile, run and debug C in
  the browser, with no server involved.
- **API reference** (`src/content/items/`): one page per function/macro/type for every
  header in K&R Appendix B, plus `errno.h` and `stddef.h`. Details are checked against the
  GNU C Library manual (retrieved via Context7).

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Adding an item

Create `src/content/items/<header>/<name>.md`:

```md
---
name: strncpy
kind: fn            # fn | macro | type
header: string      # any slug listed in src/data/headers.ts
summary: One-line description shown in lists and search.
signature: "char *strncpy(char *restrict to, const char *restrict from, size_t size);"
standard: ISO C     # optional, default "ISO C"
safety: "MT-Safe"   # optional
source: https://sourceware.org/glibc/manual/latest/html_node/...
---

Markdown body. Use `<div class="warning">` for warning callouts.
Link siblings with `../fn.malloc/`, other headers with `../../stdio/fn.printf/`.
```

It's published at `/<header>/<kind>.<name>/`, like rustdoc's `fn.name.html`.

## Adding a book chapter

Create `src/content/book/NN-slug.md` with `title`, `number` ("1", "A", …), `order` and
`summary` in the frontmatter. It's served at `/book/slug/`; `##` headings become the
sidebar's section list and search entries.

## Writing exercises

Each exercise is a `##` heading with a difficulty badge, then optional hint and solution blocks
(keep the blank lines so the Markdown inside renders):

```md
## Exercise 3-7 · Title <span class="diff medium">medium</span>

Task description.

<details class="hint"><summary>Hint</summary>

...

</details>

<details class="solution"><summary>Solution</summary>

...

</details>
```

## The playground

`src/playground/` is a small C toolchain written in TypeScript that runs entirely in the browser:

| File | Role |
|---|---|
| `lexer.ts` | tokenizer and a tiny preprocessor (`#include` accepted, object-like `#define`) |
| `parser.ts` | recursive-descent parser producing a typed AST; declares the built-in libc |
| `codegen.ts` | emits x86-64 in GCC `-O0 -masm=intel` style, lays out `.text/.rodata/.data/.bss` |
| `vm.ts` | simulated CPU and Linux process: registers, segmented memory, malloc heap with ASan-style checks, libc, debugger views |
| `ui.ts` | CodeMirror editor, assembly pane, debugger and memory inspector |
| `tryit.ts` | adds "Try it" buttons to C examples on other pages that the simulator can compile |
| `examples.ts` | the example programs in the playground menu |

Supported: integer types, pointers, arrays, structs, typedef, enum, globals/statics, all
operators and control flow, recursion, and a libc subset. Not supported: floating point,
function pointers, unions, user varargs, function-like macros, goto, struct by value, files.
64-bit values are exact up to 2^53.

When changing the compiler, compare its behavior with real GCC: write a test program,
compile it with `gcc` and run it in the simulator (e.g. `node` can import `src/playground/index.ts`
directly), and diff the output and exit status.
