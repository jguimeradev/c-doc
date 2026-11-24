# c-doc — Project Documentation

A static documentation site for the C language, built with [Astro](https://astro.build). It is styled after Rust's API documentation (rustdoc) with an MDN-style dark theme, and has five parts:

| Part | URL | What it is |
|---|---|---|
| **API reference** | `/`, `/<header>/`, `/<header>/<kind>.<name>/` | One page per function, macro and type of the C standard library (213 entries across 14 headers) |
| **The C Book** | `/book/` | 13 chapters whose structure follows Kernighan & Ritchie's *The C Programming Language*, written in original text |
| **Exercises** | `/book/<chapter>/exercises/` | 49 exercises with difficulty, hints and solutions, one page per chapter (1–8) |
| **Projects** | `/projects/` | 8 multi-chapter projects with specs, milestones, starter code and test plans |
| **Playground** | `/playground/` | An in-browser C compiler, x86-64 simulator and debugger |

Everything is static: the build produces plain HTML/CSS/JS in `dist/` that any static host can serve. The playground runs entirely in the visitor's browser.

---

## Contents

1. [Quick start](#1-quick-start)
2. [Technology](#2-technology)
3. [Directory structure](#3-directory-structure)
4. [Content model](#4-content-model)
5. [Routes and pages](#5-routes-and-pages)
6. [Layout, navigation and themes](#6-layout-navigation-and-themes)
7. [Search](#7-search)
8. [Authoring guide](#8-authoring-guide)
9. [The playground](#9-the-playground)
10. [Testing and verification](#10-testing-and-verification)
11. [Building and deploying](#11-building-and-deploying)
12. [Sources, attribution and licensing](#12-sources-attribution-and-licensing)
13. [Known limitations](#13-known-limitations)
14. [Extending the project](#14-extending-the-project)

---

## 1. Quick start

Requirements: Node.js 22.23.4 or newer (Astro 7's minimum; developed with Node 26) and npm 9.6.5 or newer.

```sh
npm install
npm run dev       # development server at http://localhost:4321, with hot reload
npm run build     # static site in dist/
npm run preview   # serve dist/ locally to check the production build
```

---

## 2. Technology

| Piece | Used for |
|---|---|
| **Astro 7** | Static site generation, content collections, routing, script bundling (Vite) |
| **Astro content collections** (`glob` loader + Zod schemas) | Markdown content with validated frontmatter |
| **Shiki** (built into Astro) | Syntax highlighting of Markdown code blocks, with dual light/dark themes |
| **CodeMirror 6** | The playground editor (`codemirror`, `@codemirror/lang-cpp`, `@codemirror/theme-one-dark`, `@codemirror/view`, `@codemirror/state`, `@codemirror/language`) |
| **TypeScript** | Page logic and the entire playground toolchain (compiler + VM + UI) |
| **Google Fonts** | Fira Sans, Source Serif 4, Source Code Pro (rustdoc themes) and Inter (MDN theme) |

There is no backend, no database and no client framework. Client-side code is plain TypeScript bundled by Astro.

---

## 3. Directory structure

```text
c-doc/
├── astro.config.mjs          Astro config: trailingSlash 'always', Shiki dual themes
├── package.json
├── tsconfig.json             extends astro/tsconfigs/strict
├── README.md                 short project README
├── docs/
│   └── documentation.md      this file
├── public/
│   └── favicon.svg
└── src/
    ├── content.config.ts     collection definitions and schemas
    ├── content/
    │   ├── items/<header>/<name>.md     API reference entries (213)
    │   ├── book/NN-<slug>.md            book chapters (13)
    │   ├── exercises/<chapter-id>.md    exercises, one file per chapter (8)
    │   └── projects/NN-<slug>.md        projects (8)
    ├── data/
    │   ├── headers.ts        the 14 standard headers: slug, file, summary, K&R appendix section
    │   └── nav.ts            URL helpers and sidebar section builders
    ├── layouts/
    │   └── DocLayout.astro   the single page layout: sidebar, search bar, theme picker
    ├── pages/
    │   ├── index.astro                  home (libc overview)
    │   ├── [header]/index.astro         header ("module") pages
    │   ├── [header]/[item].astro        item pages
    │   ├── book/index.astro             book contents
    │   ├── book/[chapter].astro         chapter pages
    │   ├── book/[chapter]/exercises.astro
    │   ├── projects/index.astro
    │   ├── projects/[project].astro
    │   ├── playground.astro
    │   └── search-index.json.ts         static JSON search index
    ├── playground/
    │   ├── types.ts          C type system (LP64)
    │   ├── lexer.ts          tokenizer + mini preprocessor
    │   ├── parser.ts         parser → typed AST; built-in libc prototypes
    │   ├── codegen.ts        AST → x86-64 (Intel syntax), section layout
    │   ├── vm.ts             simulated CPU, memory, heap, libc, debugger views
    │   ├── index.ts          public API: compile(), Machine, types
    │   ├── ui.ts             playground UI (CodeMirror, panes, inspector)
    │   ├── examples.ts       example programs for the playground menu
    │   └── tryit.ts          "Try it" buttons on code blocks elsewhere on the site
    └── styles/
        ├── rustdoc.css       site-wide styles and all themes
        └── playground.css    playground-only styles
```

Generated directories (ignored by git): `node_modules/`, `dist/`, `.astro/`.

---

## 4. Content model

Collections are defined in `src/content.config.ts`. Frontmatter is validated at build time, so a typo in a field fails the build with a clear message.

### 4.1 `items`: API reference

Path: `src/content/items/<header>/<name>.md`. Served at `/<header>/<kind>.<name>/`, the way rustdoc uses `fn.name.html`.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Identifier as written in C (`malloc`, `EOF`, `tm`) |
| `kind` | `fn` \| `macro` \| `type` | Drives the URL prefix, the page title ("Function", "Macro", "Type") and the color |
| `header` | one of the slugs in `src/data/headers.ts` | e.g. `stdio`, `stdlib` |
| `summary` | string | One line, shown in lists, the sidebar and search |
| `signature` | string | The C declaration shown in the code block at the top |
| `standard` | string, default `ISO C` | e.g. `ISO C99`, `ISO C (removed in C11)` |
| `safety` | string, optional | POSIX safety annotation from the glibc manual |
| `source` | URL, optional | Link to the relevant glibc manual page (the "source" link) |

Entries per header: assert 2, ctype 13, errno 4, float 16, limits 18, math 23, setjmp 3, signal 10, stdarg 5, stddef 3, stdio 54, stdlib 29, string 20, time 13.

The 14 headers themselves are described in `src/data/headers.ts` (slug, file name, matching K&R Appendix B section, summary, HTML description). Adding a header requires an entry there; the `header` enum in the schema is derived from it.

### 4.2 `book`: chapters

Path: `src/content/book/NN-<slug>.md`. The numeric prefix is stripped from the id, so `05-pointers-arrays.md` is served at `/book/pointers-arrays/`.

| Field | Type | Notes |
|---|---|---|
| `title` | string | Chapter title |
| `number` | string | Label: `"0"` (introduction), `"1"`–`"8"`, or `"A"`–`"D"` for appendices |
| `order` | number | Sort order |
| `summary` | string | Shown in the contents table and search |

Chapters:

| # | File | Topic |
|---|---|---|
| 0 | `00-introduction.md` | About C and this book |
| 1–8 | `01`…`08` | Tutorial; Types, Operators and Expressions; Control Flow; Functions and Program Structure; Pointers and Arrays; Structures; Input and Output; The UNIX System Interface |
| A | `09-reference-manual.md` | Language reference summary |
| B | `10-standard-library.md` | Map of the standard headers, linking into the API reference |
| C | `11-gcc-and-standards.md` | What GCC is, compilation stages, flags, the C standards (K&R C → C23) |
| D | `12-libraries-tools-projects.md` | Curated libraries, tools, codebases and guides |

Level-2 headings (`##`) become the "Sections" list in the sidebar and entries in the search index.

### 4.3 `exercises`

Path: `src/content/exercises/<chapter-id>.md` (e.g. `control-flow.md`). Served at `/book/<chapter-id>/exercises/`.

| Field | Type | Notes |
|---|---|---|
| `chapter` | string | Must match a book chapter id; the build fails otherwise |
| `summary` | string | One line describing the exercises |

Exercise markup is described in [8.3](#83-exercises).

### 4.4 `projects`

Path: `src/content/projects/NN-<slug>.md`. Served at `/projects/<slug>/`.

| Field | Type | Notes |
|---|---|---|
| `title` | string | `"<short name> — <description>"`; the part before ` — ` is used as the short name |
| `order` | number | Sort order |
| `summary` | string | Card text |
| `level` | `beginner` \| `intermediate` \| `advanced` | Badge color |
| `chapters` | string[] | Book chapter ids the project draws on (validated at build) |
| `skills` | string[] | Shown as chips |
| `platform` | string, default `Any C17 compiler` | e.g. `POSIX (Linux, macOS, BSD, WSL)` |

Projects: wordstat, hexview, life, calc, contacts, kvstore, minishell, huff.

---

## 5. Routes and pages

| Route | Source | Generated from |
|---|---|---|
| `/` | `pages/index.astro` | Headers, book chapters, projects |
| `/<header>/` | `pages/[header]/index.astro` | `headers.ts`, items grouped by kind (Macros, Types, Functions) |
| `/<header>/<kind>.<name>/` | `pages/[header]/[item].astro` | One per item |
| `/book/` | `pages/book/index.astro` | Chapter list with exercise links |
| `/book/<chapter>/` | `pages/book/[chapter].astro` | One per chapter, with previous/next navigation and an exercises call-out |
| `/book/<chapter>/exercises/` | `pages/book/[chapter]/exercises.astro` | One per exercises file |
| `/projects/` | `pages/projects/index.astro` | Project cards |
| `/projects/<slug>/` | `pages/projects/[project].astro` | One per project |
| `/playground/` | `pages/playground.astro` | Static shell; all behavior in `playground/ui.ts` |
| `/search-index.json` | `pages/search-index.json.ts` | Static endpoint built at compile time |

`trailingSlash: 'always'` is set in `astro.config.mjs`, so every page is a directory with an `index.html`. Links in Markdown content are written as absolute paths (`/stdio/fn.printf/`), which means **the site must be served from the root of a domain**, not a sub-path (see [11](#11-building-and-deploying)).

---

## 6. Layout, navigation and themes

### 6.1 `DocLayout.astro`

Every page uses one layout. Props:

| Prop | Purpose |
|---|---|
| `title` | `<title>` |
| `location`, `locationHref` | The name shown at the top of the sidebar |
| `sections` | Sidebar sections: `{ title, href?, links: { label, href, kind?, current? }[] }[]` |
| `wide` | Full width, no sidebar (used by the playground) |

The layout always prepends a **Tools** section with a link to the playground. It also contains the search bar, the theme picker, the footer attribution and two scripts: the search UI, and `tryit.ts`, which adds "Try it" buttons ([9.10](#910-try-it-buttons-on-other-pages)).

Sidebar builders live in `src/data/nav.ts`: `headersSection()`, `bookSection(currentId)`, `projectsSection(currentId)`, plus URL helpers (`url`, `itemUrl`, `chapterUrl`, `exercisesUrl`, `projectUrl`) that respect `import.meta.env.BASE_URL`.

### 6.2 Themes

Four themes, selected with the picker and stored in `localStorage` under `cdoc-theme`:

| Value | Label | Description |
|---|---|---|
| `mdn` | mdn dark | **Default.** `#1b1b1b` background, white text, `#8cb4ff` links, Inter font, neutral sidebar |
| `light` | light | rustdoc light |
| `dark` | rust dark | rustdoc dark |
| `ayu` | ayu | rustdoc ayu |

An inline script in `<head>` sets `data-theme` on `<html>` before first paint, which avoids a flash of the wrong theme. All colors are CSS custom properties on `:root[data-theme='…']` in `rustdoc.css`. The most important ones:

| Variable | Use |
|---|---|
| `--main-bg`, `--main-color`, `--sidebar-bg`, `--muted`, `--border`, `--code-bg`, `--link` | Base palette |
| `--kind-fn`, `--kind-macro`, `--kind-type`, `--kind-mod`, `--kind-book`, `--kind-project` | Item-kind colors (rustdoc convention) |
| `--font-sans`, `--font-serif`, `--font-mono` | Per-theme fonts (the MDN theme uses Inter for both sans and serif) |
| `--easy`, `--medium`, `--hard`, `--hint-bg`, `--solution-bg` | Exercise badges and blocks |

Code blocks use Shiki dual themes (`github-light` / `github-dark`) with `defaultColor: false`. CSS chooses `--shiki-light` or `--shiki-dark` according to `data-theme`.

---

## 7. Search

`src/pages/search-index.json.ts` builds a static JSON array at compile time. Each entry is `{ n: name, k: kind, h: header-or-section, d: description, u: url }` and covers:

- every API item and header;
- every book chapter and each of its `##` sections;
- every exercise (each `##` heading);
- every project, plus the playground.

The search script in `DocLayout.astro` fetches the index once, the first time the search box is focused. It ranks results as exact match, then prefix, then substring, then description match. Keys: `S` or `/` focuses the box, arrow keys move through results, Enter opens one, Esc clears.

---

## 8. Authoring guide

### 8.1 API reference entry

```md
---
name: strncpy
kind: fn
header: string
summary: Copies at most n characters, padding with nulls. May leave s unterminated.
signature: "char *strncpy(char *restrict s, const char *restrict ct, size_t n);"
standard: ISO C
source: https://sourceware.org/glibc/manual/latest/html_node/Truncating-Strings.html
---

Body in Markdown. Use `## Return value`, `## Examples`, `## Notes`.

<div class="warning">

Warning callouts need blank lines inside so the Markdown renders.

</div>
```

Link to siblings relatively (`../fn.malloc/`) or anywhere absolutely (`/stdio/fn.printf/`).

### 8.2 Book chapter

Use `## N.M Title` for sections. Section headings get anchors such as `#54-address-arithmetic` (the GitHub slug rules: lower-cased, punctuation removed).

### 8.3 Exercises

Each exercise is a `##` heading with a difficulty badge, then optional hint and solution blocks. Keep the blank lines so the Markdown inside the HTML renders:

```md
## Exercise 3-7 · Title <span class="diff medium">medium</span>

Task description.

<details class="hint"><summary>Hint</summary>

Hint text.

</details>

<details class="solution"><summary>Solution</summary>

```c
/* solution code */
```

</details>
```

Difficulty classes: `easy`, `medium`, `hard`. The badge text becomes part of the heading anchor (e.g. `#exercise-7-2--hexdump-medium`).

### 8.4 Projects

The recommended structure is Overview, What you'll practice, Specification, Milestones (`### 1. …`), Starter code, Testing, Stretch goals. Starter code should compile.

### 8.5 Style rules for content

- **Original text only.** The book follows K&R's structure, not its prose or example programs.
- C examples should compile cleanly with `gcc -std=c17 -Wall -Wextra`.
- Prefer modern C (C99+) and point out where older K&R/ANSI C differs.

---

## 9. The playground

### 9.1 Overview

`/playground/` compiles, runs and debugs C in the browser. The toolchain is implemented from scratch in TypeScript (about 4,600 lines in `src/playground/`):

```text
source ──► lexer.ts ──► parser.ts ──► codegen.ts ──► Compiled program ──► vm.ts (Machine) ──► ui.ts
           tokens       typed AST     x86-64 insts,                       simulated process   editor, assembly,
           + #define                  sections, layout                    + libc + debugger   inspector panes
```

The public API is `src/playground/index.ts`:

```ts
import { compile, Machine } from './playground/index.ts';

const r = compile(source);           // { ok: true, program } | { ok: false, error: { message, line, col } }
if (r.ok) {
  const m = new Machine(r.program, { stdin: '5 10', sanitizer: true });
  const why = m.run('run', new Set(), 10_000_000);   // 'exit' | 'fault' | 'breakpoint' | 'step' | 'budget'
  console.log(m.out, m.exitCode, m.fault);
}
```

These modules have no DOM dependencies, so Node.js (with type stripping) can import them directly for testing.

### 9.2 Supported C

| Supported | Not supported |
|---|---|
| `char`, `short`, `int`, `long` (signed/unsigned), `_Bool`/`bool`, `void` | `float`, `double` (rejected with an explanatory error) |
| Pointers, multi-level pointers, arrays (incl. multi-dimensional), `sizeof` | Function pointers |
| `struct` (with padding/alignment), `typedef`, `enum` | `union` |
| Globals, `static` locals, `extern`, `const` (accepted) | Passing/returning structs by value |
| All operators incl. compound assignment, `?:`, comma, casts | Compound literals, statement expressions |
| `if`, `switch` (with fall-through), `while`, `do`, `for` (with declarations), `break`, `continue`, `return` | `goto` |
| Recursion, up to 16 arguments (6 in registers, the rest on the stack) | Variadic functions you define (`va_list`) |
| Designated initializers for arrays and structs | Function-like macros, `#if`/`#ifdef` |
| Object-like `#define`, `#include` (accepted, ignored), `#undef`, `#pragma` | Files, system calls, processes |

Built-in typedefs: `size_t`, `ssize_t`, `ptrdiff_t`, `time_t`, `int8_t`…`uint64_t`, `FILE`. Predefined macros: `NULL`, `true`, `false`, `EOF`, `EXIT_SUCCESS`, `EXIT_FAILURE`, `RAND_MAX`, the `<limits.h>` constants (`CHAR_BIT`, `INT_MAX`, `SHRT_MIN`, `UCHAR_MAX`, …). `stdin`, `stdout` and `stderr` are fake handles 0, 1 and 2.

**64-bit precision:** registers hold JavaScript numbers, so 64-bit values are exact only up to 2⁵³. Integer constants larger than that, including `LONG_MAX` and `ULONG_MAX`, produce a compile error that says so instead of a silently wrong value. 32-bit arithmetic is exact (it uses `Math.imul` and `>>> 0` wrapping), and 64-bit bitwise operations, shifts and divisions use `BigInt`.

### 9.3 Lexer (`lexer.ts`)

- Tokens: numbers (decimal, hex, octal, `u`/`l` suffixes), character constants and string literals with all C escapes (`\n`, `\x41`, `\101`, …), identifiers, keywords and operators (longest match).
- Comments: `//` and `/* */`.
- Preprocessor: `#include` (recorded, ignored), object-like `#define` and `#undef` (expanded at the token level with recursion protection), `#pragma` (ignored). Other directives give an error.
- Predefined macros are stored as strings and tokenized lazily on first use, so an error inside one is reported at the line that uses it.
- Errors are `CompileError(message, line, col)`.

### 9.4 Parser (`parser.ts`)

Recursive descent with types computed while parsing (no separate type-checking pass).

- **Scopes:** a stack of maps for variables, typedefs and enum constants, plus a separate stack for struct tags. Self-referential structs work through incomplete struct objects that are completed in place.
- **Declarators:** pointers, arrays (`[n]`, unsized arrays inferred from initializers), function parameter lists (`void`, `...`). Array parameters decay to pointers.
- **Expressions:** standard C precedence climbing. Pointer arithmetic is typed (`ptr + int`, `int + ptr` normalized, `ptr - ptr` → `ptrdiff` node of type `long`). `assert(e)` is rewritten to `e ? (void)0 : __assert_fail("e", line)` with the expression's source text.
- **Diagnostics** follow GCC's wording where possible, e.g. "assignment makes pointer from integer without a cast", "too few arguments to function 'f' (expected 2, got 1)", "lvalue required as left operand of assignment", "implicit declaration of function 'f'". Unsupported library functions get a reason (e.g. `fopen`: "there is no file system in the simulator").
- **Built-in library:** `BUILTINS` maps each libc function to its prototype ([9.6.6](#966-libc)).
- **Output:** `Program { funcs, globals, strings, usedBuiltins }`. Each `Func` lists its params and locals (`Var` objects whose stack offsets are filled in by codegen).

### 9.5 Code generator (`codegen.ts`)

Produces instructions in the style of `gcc -O0 -masm=intel`.

**Conventions**

- System V AMD64 ABI: integer and pointer arguments in `rdi, rsi, rdx, rcx, r8, r9`, then on the stack. Return value in `rax`. `eax` is set to 0 before calling a variadic function.
- Every function has a frame-pointer prologue: `push rbp; mov rbp, rsp; sub rsp, N` (N rounded to 16), then parameters are stored into stack slots. The epilogue is `leave; ret` (or `pop rbp; ret` when N = 0).
- Locals live at `[rbp-offset]`, assigned in declaration order with natural alignment.
- Expressions leave their result in `rax`/`eax` (32-bit for `char`/`short`/`int`, 64-bit for `long` and pointers). Binary operations evaluate the left side, push it, evaluate the right side into `rcx`, then pop. Simple variables and constants skip the push/pop.
- Conditions compile to `cmp` followed by an inverted conditional jump (`cmp eax, 5` / `jg .L3`). `&&`, `||` and `!` short-circuit without materializing booleans.
- Struct copies and aggregate zero-initialization use `rep movsb` and `rep stosb`.
- A peephole pass removes a `jmp` that only goes to the next instruction.
- Every instruction records its **source line**, and the first instruction of each statement is flagged `stmt: true`. These flags are the debugger's stop points. Function prologues are not stop points, as in gdb.

**Instruction set used** (operands are register, immediate, memory `[base+disp]`, or RIP-relative `sym[rip]`):

`mov movabs movsx movsxd movzx lea add sub imul neg not and or xor sal sar shr cmp cdq cqo idiv div push pop call ret leave jmp je jne jl jle jg jge jb jbe ja jae sete setne setl setle setg setge setb setbe seta setae rep movsb rep stosb`

**Program layout** (computed after code generation):

| Section | Address | Contents |
|---|---|---|
| `.text` | `0x401000` | `_start` stub (`call main` → `call exit`), then functions. Instruction sizes are approximate |
| `.rodata` | next page | String literals `.LC0`, `.LC1`, … |
| `.data` | `.rodata` end + page gap | Initialized globals and `static` locals (`name.N` labels) |
| `.bss` | after `.data` (32-byte aligned) | Zero-initialized globals |

Global initializers are evaluated at compile time to bytes plus relocations (string literal addresses, `&global`, array decay, constant arithmetic). The result is `Compiled`: instructions, an assembly listing (sections, labels, instructions, data directives), function info, global symbols, the string table, section bounds, initial data bytes and an address-to-instruction map.

### 9.6 Virtual machine (`vm.ts`)

#### 9.6.1 Process memory

| Region | Range | Permissions | Notes |
|---|---|---|---|
| NULL page | `0x0`–`0x1000` | unmapped | Any access is a "NULL pointer dereference" fault |
| `.text` | `0x401000`… | r-x | Filled with a placeholder byte pattern |
| `.rodata` | … | r-- | Writes fault ("string literals cannot be modified") |
| `.data`, `.bss` | … | rw- | |
| `[heap]` | first page after `.bss` + 1 page | rw- | Grows with the program break (`brk`); limit 16 MiB |
| `[stack]` | `0x7ffffffff000 − 1 MiB` … `0x7ffffffff000` | rw- | Starts filled with pseudo-random garbage, so uninitialized locals show realistic junk. `argv[0] = "./a.out"` sits at the top |

Memory is a list of segments backed by `Uint8Array`/`DataView` (little-endian). `peek()` reads without faults or checks, for the debugger views.

#### 9.6.2 Registers and flags

The register file holds `rax rcx rdx rbx rsi rdi r8 r9 r10 r11 rsp rbp` as numbers. A 32-bit write zero-extends into the 64-bit register, as on real hardware. 8- and 16-bit writes also zero-extend; real hardware preserves the upper bits, but the generated code always follows them with `movzx`/`movsx`, so this simplification doesn't change program behavior. Flags are modeled as "the last `cmp`": its operands and width. Conditional jumps and `set*` evaluate the condition (signed or unsigned) from those.

#### 9.6.3 Heap allocator

`malloc` bumps the program break. Each block is 16-byte aligned with a 16-byte header before it holding a glibc-style `size | PREV_INUSE` word. Freed blocks are reused first-fit when the size is close, so stale data can reappear, as with real allocators. Fresh memory is zero and reused memory keeps its old contents. `calloc` zeroes, and `realloc` allocates, copies and frees. Every block records its id, address, size, freed state, allocation line and free line.

#### 9.6.4 Faults

A crash throws a `Fault(signal, title, message, addr)`. The machine stops with `rip` left on the faulting instruction, so every view shows the state at the moment of the crash (a post-mortem).

| Condition | Signal | Title |
|---|---|---|
| Access to NULL page / unmapped address | SIGSEGV | Segmentation fault |
| Write to `.text`/`.rodata` | SIGSEGV | Segmentation fault (read-only memory) |
| Access just below the stack | SIGSEGV | Stack overflow |
| `ret` to a non-code address | SIGSEGV | Segmentation fault (return address overwritten) |
| Integer division by zero, `INT_MIN / -1` | SIGFPE | Floating point exception |
| `abort()`, failed `assert` | SIGABRT | Aborted |
| Sanitizer findings ([9.6.5](#965-sanitizer)) | SIGABRT | AddressSanitizer: … |
| More than 200,000 characters of output | SIGKILL | Output limit exceeded |

`exit(n)` and returning from `main` end the program normally with that status.

#### 9.6.5 Sanitizer

When enabled (the default), heap accesses are checked against the block list. The **Sanitizer** checkbox turns this off to show how the same bugs behave silently.

- **heap-use-after-free:** the report includes the allocation and free lines.
- **heap-buffer-overflow:** reported as "N bytes after/before the K-byte block".
- **attempting double-free** and **free on address which was not malloc()-ed**.
- **memcpy-param-overlap**.
- **LeakSanitizer:** at exit, every block that was never freed is reported with its size and allocation line.

As in real C, stack out-of-bounds writes are not detected until they corrupt something, such as a return address.

#### 9.6.6 libc

Implemented in JavaScript and called through `call <name>`; arguments are read from the System V registers and stack.

- **I/O:** `printf`, `fprintf` (stdout/stderr), `sprintf`, `snprintf`, `puts`, `fputs`, `putchar`, `fputc`, `putc`, `getchar`, `scanf` (`%d %i %u %x %c %s` with widths and `*`), `perror`.
- **Memory:** `malloc`, `calloc`, `realloc`, `free`.
- **Strings:** `strlen`, `strcpy`, `strncpy`, `strcat`, `strcmp`, `strncmp`, `strchr`, `strrchr`, `strstr`, `strtok`, `memset`, `memcpy`, `memmove`, `memcmp`.
- **Conversion and misc:** `atoi`, `atol`, `strtol`, `strtoul`, `abs`, `labs`, `rand`, `srand`, `time`, `exit`, `abort`.
- **ctype:** `isdigit`, `isalpha`, `isalnum`, `isspace`, `isupper`, `islower`, `ispunct`, `isxdigit`, `isprint`, `toupper`, `tolower`.

The `printf` family supports flags `- + space 0 #`, width and precision (including `*`), length modifiers `hh h l ll z j t`, and the conversions `d i u x X o c s p n %`. Floating-point conversions produce an "unsupported" fault. `stdin` comes from the playground's stdin box, and `rand` is a deterministic LCG with seed 1.

#### 9.6.7 Debugger API

```ts
m.run(mode, breakpoints, budget, { startDepth?, resume? }): StopReason
```

| Mode | Stops at |
|---|---|
| `run` | Exit or fault only (breakpoints ignored) |
| `continue` | Next breakpoint |
| `into` | Next statement start anywhere |
| `over` | Next statement start at the same or shallower call depth |
| `out` | Next statement start after the current function returns |
| `instr` | After exactly one instruction |

Breakpoints are checked at statement starts in every mode except `run`. `budget` limits the instructions per call, so the UI can run long programs in chunks without freezing the page. It passes `resume: true` and the original `startDepth` on later chunks so step-over and step-out keep their target.

Views for the inspector:

- `frames()`: walks the `rbp` chain from `rip`, handling prologues and epilogues, and sets `backtraceCorrupt` when the chain is broken (e.g. after a stack smash).
- `locals(frame)`, `globalViews()` and `view(name, addr, type)`: typed value trees. Structs and arrays expand, `char` arrays render as strings, and pointers show their target via `symbolize()`.
- `symbolize(addr)` explains any address: `<fn+off>`, `.LCn "text"`, `&global`, `heap block #k (freed!)`, `&fn::local`, `argv area`.
- `mem.blocks`, `changedRegs` and `lastWrite` record the heap blocks, the registers changed in the last step and the bytes it wrote.

### 9.7 UI (`ui.ts`, `playground.astro`, `playground.css`)

**Layout:** a toolbar, a status line, then three panes (editor, assembly, inspector) above an output pane and a stdin box. The panes stack into fewer columns below 1100 px and 700 px wide.

**Editor (CodeMirror 6):**

- A breakpoint gutter (a `StateField` of gutter markers; click to toggle).
- Five line-decoration layers: per-line colors matching the assembly, the execution line, the selected-frame line, the compile-error line and the hover line.
- The theme follows the site's `data-theme` (One Dark for dark themes) through a `Compartment` and a `MutationObserver`.
- Code recompiles 350 ms after each edit, updating the assembly and errors live. Editing during a debug session ends the session.
- Breakpoints on lines without code move to the next line that has a statement, as in gdb.

**Assembly pane:** the listing has addresses (toggleable), syntax coloring and a per-source-line background color. Hovering an assembly row highlights its source line and the other rows from the same line, and hovering the source highlights the assembly. The current instruction is marked with ▶ and scrolled into view.

**Inspector tabs:**

| Tab | Shows |
|---|---|
| Variables | Call stack (click a frame to select it), locals and globals as expandable typed trees; changed values highlighted; a corrupted-backtrace notice |
| Stack | Every 8-byte slot from `argv` down to `rsp`, grouped by frame: return addresses, saved `rbp`, locals, padding and temporaries, with `rsp`/`rbp` markers, raw bytes and changed-slot highlights |
| Memory | Address-space diagram (stack, heap blocks, `.bss`, `.data`, `.rodata`, `.text`, NULL page), `size a.out` table, and a hex dump at any address with symbols and last-written bytes highlighted |
| Heap | Block table (id, address, size, live/freed/LEAKED, malloc and free lines); click a block to jump to the Memory tab |
| Registers | `rip` with its instruction, general registers in hex and signed decimal with their ABI role and symbolized values, changed registers highlighted, last-`cmp` flags |

**Keyboard shortcuts:**

| Key | Action |
|---|---|
| Ctrl/Cmd + Enter | Run |
| Ctrl/Cmd + S | Share (copy link) |
| F5 | Debug / Continue |
| Shift + F5 | Stop |
| F8 | Continue |
| F9 | Step one instruction |
| F10 | Step over |
| F11 / Shift + F11 | Step into / Step out |

**Persistence and sharing:**

| What | Where |
|---|---|
| Last code | `localStorage['cdoc-playground-code']` |
| Breakpoints | `localStorage['cdoc-playground-code-bp']` |
| Shared code | URL hash `#code=<base64url of UTF-8 source>` |

**Real GCC ↗** opens Compiler Explorer with the current code, compiler `cg142` (x86-64 GCC 14.2) and options `-O0 -masm=intel`, using `https://godbolt.org/clientstate/<base64url JSON>`. This sends the code to Compiler Explorer only when the visitor clicks the button.

**Run loop:** runs proceed in chunks of 250,000 instructions with `setTimeout` between them, so the page stays responsive. After 60,000,000 instructions the program is paused with an "infinite loop?" message.

### 9.8 Examples (`examples.ts`)

There are 14 examples, each with a hint, optional stdin and optional preset breakpoints: Hello world; Where things live in memory; Recursion; Pointers (swap); Arrays and strings; Linked list on the heap; Structs, typedef and padding; scanf input; Uninitialized variables; and the bugs: use after free, off-by-one heap overflow, NULL dereference, stack buffer overflow, memory leak.

### 9.9 Bundle sizes

The playground page loads CodeMirror and the UI (about 550 KB unminified bundle). Other pages load only a small layout script (about 3 KB), which lazy-imports the compiler (about 70 KB) only when the page contains C code blocks.

### 9.10 "Try it" buttons on other pages

`tryit.ts` runs on every documentation page. It finds Shiki code blocks marked `data-language="c"` that contain `main(`, compiles each one in the browser during idle time, and adds a **▶ Try it** button only to blocks that compile. The button links to `/playground/#code=…`. At the time of writing, 30 of the site's 99 complete example programs qualify. Most of the rest use floating point.

---

## 10. Testing and verification

These checks were used during development. The helper scripts lived outside the repository, but each is easy to recreate.

1. **Differential testing against GCC.** Write test programs, compile each with `gcc -std=c17`, run it with fixed stdin, and compare stdout and the exit status with the simulator's (`node` can import `src/playground/index.ts` directly). The suite covers recursion, 64-bit arithmetic, pointer arithmetic, 2-D arrays, struct padding, linked lists with malloc/free, unsigned wraparound, `char` overflow, negative division and modulo, `switch` fall-through, statics, `scanf`, `snprintf`, `strtok` and NULL comparisons. All tests matched GCC 14.2 byte for byte.
2. **Fault and diagnostic tests.** One program per fault type ([9.6.4](#964-faults)) checks the signal and the message. Each common compile error is checked for wording and line number.
3. **Example checks.** Every example in `examples.ts` must compile, behave as its hint says, and have its breakpoints on lines with statements.
4. **Browser tests.** Headless Chromium is driven over the Chrome DevTools Protocol to run, debug, continue, step over/into/out/instruction, switch every inspector tab, follow a Try-it link, change the theme and resize to phone width, while capturing screenshots and failing on any JavaScript exception.
5. **Type checking.** `tsc --strict --noUnusedLocals` over `ui.ts` and `tryit.ts` (which import the rest).
6. **Site checks.** Every internal link and `#anchor` in `dist/` resolves. External links in Appendix D were checked to return HTTP 200. C examples in the book, exercises and projects were compiled with `gcc -Wall -Wextra`, and key algorithms were run under `-fsanitize=address,undefined`.

---

## 11. Building and deploying

```sh
npm run build      # outputs dist/ (about 260 pages plus search-index.json and assets)
```

Deploy `dist/` to any static host, **at the root of a domain**. Markdown links are root-absolute, so a sub-path such as `username.github.io/c-doc/` would break them unless the links are rewritten.

| Host | How |
|---|---|
| Netlify | Drag `dist/` onto https://app.netlify.com/drop, or connect the repo (build `npm run build`, publish `dist`) |
| Cloudflare Pages | `npx wrangler pages deploy dist --project-name c-doc`, or connect the repo |
| Vercel | Connect the repo; Astro is detected automatically |
| GitHub Pages | Only as a user/organization site or with a custom domain (root path) |

Opening `dist/index.html` from disk does not work, for the same root-path reason; use `npm run preview`.

---

## 12. Sources, attribution and licensing

- **API reference:** written for this site, with details checked against the *GNU C Library Reference Manual* (retrieved through the Context7 documentation service). The glibc manual is licensed under the GNU Free Documentation License; the site footer credits it and each entry links its source page. Keep that attribution when publishing.
- **The C Book:** the chapter and section **structure** follows Brian W. Kernighan and Dennis M. Ritchie, *The C Programming Language* (2nd ed., 1988). All prose, examples and exercises are original; no text or example programs from the book are reproduced. Keep it that way when editing.
- **Appendix C** facts about GCC come from the GCC manual (via Context7) and were verified against GCC 14.2. Appendix D's raylib and SQLite APIs come from their official docs (via Context7).
- **Fonts:** open-source Google Fonts. The logo is an original "C" mark (no Rust branding).

---

## 13. Known limitations

- **Playground language subset:** see [9.2](#92-supported-c). Floating point is the largest gap.
- **Assembly fidelity:** GCC-style, not GCC's exact output; instruction sizes and addresses are approximate. Use the Real GCC link for the genuine output.
- **64-bit integers** are exact only up to 2⁵³ in the simulator.
- **8/16-bit register writes** zero-extend (real hardware preserves the upper bits); generated code never depends on the difference.
- **Sanitizer** covers the heap only, like ASan's heap checks, not stack or global bounds.
- **No file system** in the simulator; `fopen` and friends give a compile-time explanation.
- **Root-path hosting** is required (section 11).

---

## 14. Extending the project

**Add a reference entry:** create `src/content/items/<header>/<name>.md` ([8.1](#81-api-reference-entry)). It automatically appears in the header page, the sidebar and search.

**Add a header:** add an entry to `src/data/headers.ts`, then add items under `src/content/items/<slug>/`.

**Add a chapter, exercises or a project:** add a Markdown file with the frontmatter from [section 4](#4-content-model). Navigation, previous/next links and search update automatically.

**Add a libc function to the playground:**

1. Add its prototype to `BUILTINS` in `parser.ts`.
2. Implement it in `Machine.callBuiltin` in `vm.ts`. Read arguments with `m.arg(i)` / `m.argInt(i)`, use `m.readString` / `m.writeString` and `m.mem.read` / `m.mem.write` (which apply the sanitizer), and return a value with `m.ret(v, size)`.
3. Add a test program and compare its output with GCC.

**Add a language feature:** extend the parser (with types), add the code generation in `genExpr`/`genStmt`, and add any new instruction to `Machine.step`. Keep each instruction's `line` and `stmt` flags correct so debugging still works. Then rerun the GCC comparison and the example checks.

**Add an example:** append to `EXAMPLES` in `examples.ts` with a hint, and put breakpoints only on lines that contain statements.

**Change a theme:** edit the variables in the matching `:root[data-theme='…']` block of `rustdoc.css`. The playground inherits them.
