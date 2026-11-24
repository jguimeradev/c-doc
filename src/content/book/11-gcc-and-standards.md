---
title: GCC and the C Standards
number: "C"
order: 11
summary: What GCC is, what happens when you compile, the flags worth knowing, and what K&R C, ANSI C, C99, C11, C17 and C23 mean.
---

Two things are easy to confuse when you start with C: the **compiler** (the program that turns your source into an executable, such as GCC) and the **standard** (the document that defines what C *is*, such as C99). This appendix explains both, and how to tell one from the other.

## C.1 What GCC Is

**GCC**, the GNU Compiler Collection, is the free compiler started by Richard Stallman in 1987 for the GNU project. It began as the *GNU C Compiler* and later grew front ends for C++, Fortran, Ada, Go, D and others, hence "Collection". It's the standard compiler on most Linux distributions and is used to build the Linux kernel.

The other major C compilers are:

| Compiler | Notes |
|---|---|
| **Clang** (LLVM) | Mostly command-line compatible with GCC; default on macOS (where `gcc` is often an alias for Clang) and FreeBSD. Known for clear error messages. |
| **MSVC** | Microsoft's compiler in Visual Studio. Long lagged on C, though it now supports C11 and C17. |
| **TCC**, **cproc**, embedded vendor compilers | Small or specialized compilers. |

The same well-written, standard-conforming program should compile with any of them. That portability is the whole point of having a standard.

Check what you have:

```sh
gcc --version      # e.g. gcc (Debian 14.2.0-19) 14.2.0
```

**GCC's version number is not the C version.** GCC 14 is the fourteenth major release of the compiler; it supports *several* C standards, chosen with the `-std` option (section C.5).

## C.2 What Happens When You Compile

`gcc hello.c -o hello` looks like one step, but GCC runs four stages, and you can stop after any of them:

| Stage | What it does | Stop here with | Output |
|---|---|---|---|
| 1. Preprocessing | Runs `#include`, `#define` and `#if`; removes comments | `-E` | preprocessed C (`.i`) |
| 2. Compilation | Translates C into assembly for your CPU | `-S` | assembly (`.s`) |
| 3. Assembly | Turns assembly into machine code | `-c` | object file (`.o`) |
| 4. Linking | Combines object files and libraries into an executable | (default) | executable |

```sh
gcc -E hello.c -o hello.i     # look at what the preprocessor produced
gcc -S hello.c                # read the generated assembly in hello.s
gcc -c hello.c                # object file hello.o, not yet runnable
gcc hello.o -o hello          # link it (with the C library) into a program
```

Peeking at `-E` output is the best way to debug a confusing macro, and `-S` (try it with `-O2`) shows what your code actually becomes. The website [Compiler Explorer](https://godbolt.org) does the same in a browser.

Separate compilation (`-c`) is how larger programs are built: each `.c` file becomes a `.o` file, and only files that changed need recompiling before the final link ([section 4.1](/book/functions-program-structure/#41-basics-of-functions)).

## C.3 Flags Worth Knowing

| Flag | Meaning |
|---|---|
| `-o NAME` | name the output file (default `a.out`) |
| `-std=c17` | which C standard to follow (section C.5) |
| `-Wall -Wextra` | enable the important warnings; despite the name, `-Wall` is not "all" |
| `-pedantic` | warn about anything the chosen ISO standard doesn't allow, including GNU extensions |
| `-Werror` | treat warnings as errors |
| `-g` | include debugging information for `gdb` |
| `-O0` `-O1` `-O2` `-O3` `-Os` | optimization level: none (default), …, aggressive, optimize for size |
| `-fsanitize=address,undefined` | add run-time checks for memory errors and undefined behavior |
| `-DNAME` or `-DNAME=value` | define a macro, as if by `#define` |
| `-I DIR` | also search `DIR` for `#include "…"` and `<…>` files |
| `-L DIR` / `-lNAME` | search `DIR` for libraries / link with `libNAME` (e.g. `-lm` for math) |

A good everyday command while learning:

```sh
gcc -std=c17 -Wall -Wextra -pedantic -g -fsanitize=address,undefined prog.c -o prog
```

And for a release build:

```sh
gcc -std=c17 -Wall -Wextra -O2 prog.c -o prog
```

Order matters for libraries: put `-lm` and similar **after** the source or object files that need them.

## C.4 The Versions of C

C has been revised several times. Each revision is mostly backward compatible, so old code usually still compiles, and each is known by the year it was finished.

| Name | Year | Defined by | Highlights |
|---|---|---|---|
| **K&R C** | 1978 | the first edition of Kernighan & Ritchie's book | the original language; no official standard, no prototypes (`int f(a, b) int a; char *b; { … }`) |
| **ANSI C**, **C89** | 1989 | ANSI X3.159-1989 | the first standard: function prototypes, `void`, `const`, `volatile`, `signed`, the standard library and headers. K&R's 2nd edition (1988) describes it. |
| **C90** | 1990 | ISO/IEC 9899:1990 | the same language as C89, adopted internationally by ISO. "C89" and "C90" mean the same thing. |
| **C95** (AMD1) | 1995 | Amendment 1 to C90 | wide-character and multibyte support (`<wchar.h>`, `<wctype.h>`), digraphs, `<iso646.h>` |
| **C99** | 1999 | ISO/IEC 9899:1999 | `//` comments, declarations anywhere and in `for`, `long long`, `bool` (`<stdbool.h>`), `<stdint.h>`, `inline`, `restrict`, designated initializers, compound literals, variable-length arrays, `snprintf`, complex numbers |
| **C11** | 2011 | ISO/IEC 9899:2011 | threads (`<threads.h>`) and atomics (`<stdatomic.h>`), `_Generic`, `_Static_assert`, `_Alignas`/`_Alignof`, anonymous structs and unions, `_Noreturn`; `gets` removed; VLAs made optional |
| **C17** (C18) | 2018 | ISO/IEC 9899:2018 | bug fixes and clarifications only, no new features. Finished in 2017, published in 2018, so both names are used. |
| **C23** | 2024 | ISO/IEC 9899:2024 | `bool`, `true`, `false`, `nullptr`, `static_assert`, `alignas` as real keywords; `constexpr`, `typeof`, `auto` type inference; `[[attributes]]`; binary literals `0b1010` and digit separators `1'000'000`; `#embed`; `<stdbit.h>`, `<stdckdint.h>`; K&R-style function definitions removed; `()` now means "no parameters" |
| **C2y** | in progress | WG14 committee | the next revision, still being drafted |

Why "ANSI C"? The first standard was written by the American National Standards Institute (ANSI) in 1989 and adopted by the international ISO body a year later. Since then the work has been done by ISO's committee **WG14**, but "ANSI C" stuck as the everyday name for C89/C90.

Which one should you write? **C17 or C99 if you need maximum portability, C23 if your compilers support it.** This book targets C17 and points out C23 additions. Plain C89 is mainly needed for very old or unusual platforms.

## C.5 Choosing a Standard in GCC

`-std=` selects the language version. Each version comes in two flavors:

- `cNN` is **strict ISO C**: GNU extensions that conflict with the standard are disabled. Add `-pedantic` to also get warnings for every non-standard construct.
- `gnuNN` is ISO C **plus GNU extensions** such as statement expressions, `typeof` before C23, and nested functions.

| Standard | Strict | With GNU extensions | `__STDC_VERSION__` |
|---|---|---|---|
| C89/C90 | `-std=c89`, `-std=c90`, `-ansi` | `-std=gnu89` | not defined |
| C95 | `-std=iso9899:199409` | — | `199409L` |
| C99 | `-std=c99` | `-std=gnu99` | `199901L` |
| C11 | `-std=c11` | `-std=gnu11` | `201112L` |
| C17 | `-std=c17` (or `c18`) | `-std=gnu17` | `201710L` |
| C23 | `-std=c23` (`c2x` in older GCC) | `-std=gnu23` | `202311L` |

**If you don't pass `-std`, GCC picks a default**, which has changed over time:

| GCC versions | Default |
|---|---|
| up to 4.x | `gnu89` |
| 5 – 7 | `gnu11` |
| 8 – 14 | `gnu17` |
| 15 and later | `gnu23` |

So the same program can behave differently depending on which GCC built it: under GCC 15, `bool` and `true` are keywords and `int f();` means "takes no arguments". **Always pass `-std` explicitly** in your build files so you get the same language everywhere.

A program can check which standard it's being compiled as:

```c
#include <stdio.h>

int main(void)
{
#if defined(__STDC_VERSION__)
    printf("__STDC_VERSION__ = %ldL\n", (long)__STDC_VERSION__);
#else
    puts("C89/C90 (no __STDC_VERSION__)");
#endif
#if defined(__GNUC__)
    printf("compiled by GCC-compatible compiler %d.%d\n", __GNUC__, __GNUC_MINOR__);
#endif
    return 0;
}
```

Or ask the preprocessor directly from the shell:

```sh
$ echo __STDC_VERSION__ | gcc -std=c11 -E -P -x c -
201112L
$ echo __STDC_VERSION__ | gcc -E -P -x c -     # whatever the default is
201710L
```

(GCC 14 reports the provisional value `202000L` for `-std=c23`, because it shipped before C23 was final; GCC 15 reports `202311L`.)

## C.6 Seeing Standards in Action

This program uses several features from different revisions:

```c
#include <stdbool.h>   /* C99; not needed in C23 */
#include <stdio.h>

int main(void)
{
    // a C99 comment
    for (int i = 0; i < 3; i++)          /* C99: declaration in for */
        printf("%d ", i);

    bool done = true;                    /* C99 */
    long long big = 1LL << 40;           /* C99 */
    struct point { int x, y; } p = { .y = 2, .x = 1 };   /* C99 designated initializer */
    size_t align = _Alignof(double);     /* C11 */

    printf("\n%d %lld %d %d %zu\n", done, big, p.x, p.y, align);
    return 0;
}
```

Compile it against different standards to see what each one accepts:

```sh
gcc -std=c11 -pedantic demo.c      # clean
gcc -std=c99 -pedantic demo.c      # warning: ISO C99 does not support '_Alignof'
gcc -std=c89 -pedantic demo.c      # errors: // comments, declarations in for;
                                   # warnings: long long, designated initializers,
                                   # mixed declarations and code, ...
```

That `-std=… -pedantic` combination is the practical way to check that code really is portable to a given standard.
