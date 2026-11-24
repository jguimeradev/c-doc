---
title: Functions and Program Structure
number: "4"
order: 4
summary: Functions, scope, linkage, header files, storage classes, recursion, and the preprocessor.
---

Functions are how you divide a program into understandable pieces. A good function does one job, has a name that says what that job is, and hides the details of how it's done. Programs built that way are easier to test, reuse and change.

C encourages many small functions. They can be spread across several source files, compiled separately, and linked together along with the library.

## 4.1 Basics of Functions

Let's build a small tool that reads numbers, one per line, and reports how many there were, their minimum, maximum and mean. Sketching it first:

```text
while (another number can be read)
    update count, sum, min, max
print the summary
```

Reading a number robustly is a self-contained task, so it becomes its own function. So does printing the report.

```c
#include <stdio.h>
#include <stdlib.h>

struct stats {
    long count;
    double sum, min, max;
};

/* read_number: read one number per line into *out; return 1, 0 (bad line) or EOF */
int read_number(double *out)
{
    char line[128], *end;

    if (fgets(line, sizeof line, stdin) == NULL)
        return EOF;
    *out = strtod(line, &end);
    return end != line;
}

void add_sample(struct stats *s, double x)
{
    if (s->count == 0 || x < s->min) s->min = x;
    if (s->count == 0 || x > s->max) s->max = x;
    s->sum += x;
    s->count++;
}

void report(const struct stats *s)
{
    if (s->count == 0) {
        puts("no data");
        return;
    }
    printf("n=%ld  min=%g  max=%g  mean=%g\n",
           s->count, s->min, s->max, s->sum / s->count);
}

int main(void)
{
    struct stats s = {0};
    double x;
    int r;

    while ((r = read_number(&x)) != EOF)
        if (r == 1)
            add_sample(&s, x);
        else
            fputs("skipping non-numeric line\n", stderr);
    report(&s);
    return s.count > 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
```

(The `struct` and the `->` operator are explained in Chapter 6; for now read `s->count` as "the `count` field of the stats that `s` points to".)

The general form of a function definition is:

```text
return-type name(parameter list)
{
    declarations and statements
}
```

Parts can be minimal: `void nothing(void) {}` is a complete, legal function, useful as a placeholder while you build the rest.

`return expr;` ends the function and gives `expr`, converted to the return type, back to the caller. A `void` function can use plain `return;` or just reach its closing brace. If a function with a non-`void` return type ends without returning a value and the caller uses the result, the behavior is undefined; `main` is the exception, implicitly returning `0`.

The value `main` returns becomes the program's exit status, which shells and build scripts check. Here we fail if no numbers were read.

To build a program from several files, give them all to the compiler:

```sh
cc -Wall -o stats main.c input.c report.c
```

## 4.2 Functions Returning Non-integers

Functions can return any type except arrays and functions. This one converts a duration like `"90s"`, `"2.5m"` or `"1.25h"` into seconds:

```c
#include <stdlib.h>

/* to_seconds: parse "<number><unit>", unit one of s, m, h; return -1 on error */
double to_seconds(const char *text)
{
    char *unit;
    double value = strtod(text, &unit);

    if (unit == text)
        return -1;              /* no number at all */
    switch (*unit) {
    case 's': case '\0': return value;
    case 'm':            return value * 60;
    case 'h':            return value * 3600;
    default:             return -1;
    }
}
```

**Callers must see a declaration with the right return type.** Historically, C assumed any undeclared function returned `int`; calling `to_seconds` without a declaration would silently mangle its `double` result. C99 made calling an undeclared function an error, but the lesson stands: declare every function with a full prototype before using it, normally by including the header that declares it.

Up to C17, an empty parameter list in a declaration (`double f();`) means "unknown parameters" and disables argument checking. Write `double f(void);` for "no parameters". C23 finally makes `()` mean the same as `(void)`.

## 4.3 External Variables

Everything at the top level of a C file, outside all functions, is **external**: functions (C has no nested functions) and any variables declared there. External variables exist for the whole run of the program and keep their values between function calls.

They're one way for several functions to share data without passing it around. A good, contained use is a module that owns some state and exposes a few functions to operate on it. Here's a fixed-size **ring buffer** that keeps the last few readings, for computing a moving average:

```c
/* ringbuf.c */
#include "ringbuf.h"

#define CAPACITY 8

static double items[CAPACITY];
static int head = 0;    /* index of the oldest item */
static int size = 0;    /* number of items stored */

void rb_push(double x)
{
    int tail = (head + size) % CAPACITY;
    items[tail] = x;
    if (size < CAPACITY)
        size++;
    else
        head = (head + 1) % CAPACITY;   /* full: overwrite the oldest */
}

int rb_size(void)
{
    return size;
}

double rb_mean(void)
{
    double sum = 0;
    for (int i = 0; i < size; i++)
        sum += items[(head + i) % CAPACITY];
    return size ? sum / size : 0.0;
}
```

The calling program only knows about the three functions:

```c
/* main.c */
#include <stdio.h>
#include "ringbuf.h"

int main(void)
{
    double x;
    while (scanf("%lf", &x) == 1) {
        rb_push(x);
        printf("%8.3f  (avg of last %d: %.3f)\n", x, rb_size(), rb_mean());
    }
    return 0;
}
```

`items`, `head` and `size` are external to the functions in `ringbuf.c`, so all three share them, but the `static` keyword (section 4.6) hides them from every other file.

## 4.4 Scope Rules

A program spread over several files raises practical questions. How does code in one file refer to a variable defined in another? How do we make sure there's exactly one copy of it? Where should it be initialized? The answers come from C's rules for **scope** and **linkage**.

The **scope** of a name is the region of source code where it can be used:

- a local variable: from its declaration to the end of the enclosing block;
- a parameter: the whole function body;
- an external variable or function: from its declaration to the end of the file.

To use an external variable before its definition, or from a different file, you need a **declaration** marked `extern`. The distinction matters:

```c
int verbose = 0;       /* definition: allocates storage, may initialize */
extern int verbose;    /* declaration: "there is an int called verbose somewhere" */
extern char log_path[];  /* array size not needed in a declaration */
```

Across all the files of a program there must be **one** definition of each external variable; every other file that uses it contains an `extern` declaration. Only the definition may have an initializer.

## 4.5 Header Files

Declarations shared between files belong in a **header**. The ring buffer's header lists exactly what users may call:

```c
/* ringbuf.h */
#ifndef RINGBUF_H
#define RINGBUF_H

void   rb_push(double x);
int    rb_size(void);
double rb_mean(void);

#endif
```

Both `main.c` and `ringbuf.c` include it. Including it in `ringbuf.c` itself is important: the compiler then checks that the definitions match the declarations, so they can't drift apart.

The `#ifndef`/`#define`/`#endif` lines form an **include guard**, which makes including the header twice harmless (see [section 4.11](#4113-conditional-inclusion)).

How finely to split headers is a judgment call. A small program can share one header; a larger one usually has one header per module, each exposing as little as possible.

## 4.6 Static Variables

`static` on an external variable or function restricts it to the file it's defined in (**internal linkage**). Other files can't see it, and can use the same name for something else without a clash. In `ringbuf.c`, that's what keeps `items`, `head` and `size` private.

Make every function that isn't part of a file's public interface `static`. It documents intent, prevents name collisions at link time, and lets the compiler optimize more aggressively.

`static` on a **local** variable means something different: the variable keeps its value between calls instead of being recreated each time. It is initialized once, before the program starts.

```c
/* unique_name: return "tmp1", "tmp2", ... on successive calls */
const char *unique_name(void)
{
    static char buf[32];
    static unsigned counter = 0;
    snprintf(buf, sizeof buf, "tmp%u", ++counter);
    return buf;     /* valid until the next call */
}
```

Returning a pointer to a static buffer is a common library technique (see [`strerror`](/string/fn.strerror/)), but it isn't thread-safe and each call overwrites the previous result.

## 4.7 Register Variables

The `register` storage class was a hint that a variable should live in a CPU register. Compilers have long ignored it and do a better job on their own. Its only lasting effect is that you can't take the variable's address. You'll meet it in old code; you don't need it in new code.

## 4.8 Block Structure

Any block can declare its own variables (and since C99 declarations can appear anywhere in a block, not just at its top). An inner declaration **shadows** an outer one with the same name until the end of the inner block:

```c
int level = 1;
if (deep) {
    int level = 2;          /* shadows the outer level */
    printf("%d\n", level);  /* 2 */
}
printf("%d\n", level);      /* 1 */
```

It's legal, but easy to misread; `-Wshadow` reports it.

Declare variables as close as possible to where they're first used, and in the narrowest block that works. The reader then knows they don't matter anywhere else.

## 4.9 Initialization

Without an explicit initializer, external and `static` variables start as zero (null for pointers); automatic variables start with indeterminate values.

External and `static` initializers must be constant expressions. Automatic variables can be initialized with any expression, including function calls: `size_t len = strlen(name);`.

Arrays take a brace-enclosed list. If you omit the size, the compiler counts the elements; if you give fewer elements than the size, the remainder are zero:

```c
int primes[] = { 2, 3, 5, 7, 11, 13 };   /* size 6 */
double weights[8] = { 0.5, 0.25 };        /* rest are 0.0 */
```

C99's **designated initializers** set specific elements or fields by name:

```c
const char *errnames[] = { [0] = "ok", [2] = "not found", [5] = "denied" };
```

A `char` array can be initialized with a string literal, which includes the terminating null:

```c
char greeting[] = "hi";   /* { 'h', 'i', '\0' }, size 3 */
```

## 4.10 Recursion

A function may call itself, directly or through other functions. Each active call has its own parameters and local variables.

Recursion is the natural fit when a problem contains smaller copies of itself. The Towers of Hanoi is the textbook case: to move `n` disks from peg A to peg C, move `n-1` of them out of the way to B, move the largest to C, then move the `n-1` from B onto C.

```c
void hanoi(int n, char from, char to, char via)
{
    if (n == 0)
        return;
    hanoi(n - 1, from, via, to);
    printf("move disk %d from %c to %c\n", n, from, to);
    hanoi(n - 1, via, to, from);
}
```

**Merge sort** splits an array in half, sorts each half recursively, then merges the two sorted halves:

```c
#include <string.h>

static void merge(int a[], int tmp[], int lo, int mid, int hi)
{
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi)
        tmp[k++] = (a[j] < a[i]) ? a[j++] : a[i++];
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi)  tmp[k++] = a[j++];
    memcpy(a + lo, tmp + lo, (hi - lo) * sizeof a[0]);
}

/* merge_sort: sort a[lo..hi-1]; tmp must be as large as a */
void merge_sort(int a[], int tmp[], int lo, int hi)
{
    if (hi - lo < 2)
        return;
    int mid = lo + (hi - lo) / 2;
    merge_sort(a, tmp, lo, mid);
    merge_sort(a, tmp, mid, hi);
    merge(a, tmp, lo, mid, hi);
}
```

Taking `a[j]` only when it's strictly smaller keeps equal elements in their original order, so this sort is *stable*, unlike the library's [`qsort`](/stdlib/fn.qsort/).

Recursion has costs: each call uses stack space, and very deep recursion can overflow the stack. But for problems shaped like trees, recursive code is usually shorter and far easier to get right than an iterative version with an explicit stack.

## 4.11 The C Preprocessor

Before the compiler proper sees your code, the **preprocessor** handles every line starting with `#`. You can view its output with `cc -E file.c`.

### 4.11.1 File inclusion

```c
#include <stdlib.h>    /* searched for in the system's include directories */
#include "ringbuf.h"   /* searched for next to the including file first */
```

The directive is replaced by the file's contents. Included files may include others. When a header changes, every file that includes it must be recompiled; `make` and similar tools track those dependencies.

### 4.11.2 Macro substitution

```c
#define NAME replacement text
```

From then on, each occurrence of the token `NAME` is replaced with the text, except inside string literals. A backslash at the end of a line continues the definition.

Macros can take parameters:

```c
#define CLAMP(x, lo, hi) ((x) < (lo) ? (lo) : (x) > (hi) ? (hi) : (x))
#define ARRAY_LEN(a)     (sizeof (a) / sizeof (a)[0])

int pct = CLAMP(raw, 0, 100);
for (size_t i = 0; i < ARRAY_LEN(primes); i++) ...
```

Macros are type-agnostic and cost nothing at run time, but they are pure text substitution, which brings hazards:

- **Parenthesize each parameter and the whole expansion.** With `#define DOUBLE(x) x + x`, `3 * DOUBLE(2)` becomes `3 * 2 + 2`, which is 8.
- **Arguments can be evaluated more than once.** `CLAMP(next(), 0, 9)` may call `next()` three times. Where possible, use a `static inline` function instead.

`#undef NAME` cancels a definition.

Inside a macro body, `#param` turns an argument into a string literal, and `a ## b` glues two tokens into one:

```c
#define SHOW_INT(expr)   printf("%s = %d\n", #expr, (expr))
#define FIELD(name)      int name##_count

SHOW_INT(width * height);   /* prints "width * height = 1200" */
struct counters { FIELD(read); FIELD(write); };   /* read_count, write_count */
```

### 4.11.3 Conditional inclusion

Preprocessor conditionals decide which lines are compiled at all, based on values known at build time:

```c
#if defined(_WIN32)
#  include <windows.h>
#  define sleep_ms(ms) Sleep(ms)
#elif defined(__unix__) || defined(__APPLE__)
#  include <time.h>
static inline void sleep_ms(long ms)
{
    struct timespec t = { ms / 1000, (ms % 1000) * 1000000L };
    nanosleep(&t, NULL);
}
#else
#  error "unsupported platform"
#endif
```

`#ifdef X` means `#if defined(X)` and `#ifndef X` means `#if !defined(X)`. They're also how build options are switched on: compile with `-DDEBUG` and guard diagnostic code with `#ifdef DEBUG`.

The include guard in section 4.5 relies on this: the first time the header is processed, its guard name is undefined, so the contents are kept and the name gets defined; any later inclusion sees the name and skips everything. Nearly every compiler also understands `#pragma once` to the same effect.
