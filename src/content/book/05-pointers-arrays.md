---
title: Pointers and Arrays
number: "5"
order: 5
summary: Addresses, pointer arithmetic, strings, multi-dimensional arrays, and pointers to functions.
---

A **pointer** is a value that holds the memory address of something else. Pointers are central to C: they're how functions modify their caller's data, how strings and arrays are passed around, how dynamic data structures are linked together, and how generic code accepts "any function" or "any type". They're also the source of C's most notorious bugs, so it's worth understanding them precisely.

## 5.1 Pointers and Addresses

Think of memory as a long row of numbered bytes. Each object occupies some consecutive bytes, and the number of its first byte is its **address**. A pointer variable stores such an address (typically in 8 bytes on a 64-bit system).

Two operators connect objects and addresses:

- `&x` yields the address of `x`;
- `*p` yields the object that pointer `p` points at (**dereferencing**).

```c
int score = 70;
int *p;            /* p can hold the address of an int */

p = &score;        /* p points at score */
*p = 95;           /* score is now 95 */
int copy = *p;     /* copy is 95 */
```

Read the declaration `int *p;` as "`*p` is an `int`". C declarations are written to resemble how the variable is used.

A dereferenced pointer can go anywhere the object itself could:

```c
*p += 5;           /* score += 5 */
(*p)++;            /* parentheses needed: without them, p itself is incremented */
int *q = p;        /* q and p now point at the same int */
```

Each pointer type knows what it points to: an `int *` points to an `int`, a `double *` to a `double`. The exception is `void *`, a generic "address of something" that can hold any object pointer but must be converted to a specific type before you dereference it.

**Null pointers.** A pointer equal to [`NULL`](/stdlib/macro.NULL/) points at nothing. Library functions return it to mean "none" or "failed". Dereferencing a null pointer is undefined behavior; on most systems it crashes immediately, which is the lucky outcome.

## 5.2 Pointers and Function Arguments

Arguments are passed by value, so a function receives copies. To let a function change the caller's variables, pass their addresses:

```c
/* min_max: store the smallest and largest of a[0..n-1] into *lo and *hi */
void min_max(const int a[], int n, int *lo, int *hi)
{
    *lo = *hi = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < *lo) *lo = a[i];
        if (a[i] > *hi) *hi = a[i];
    }
}

int smallest, largest;
min_max(readings, count, &smallest, &largest);
```

This is also how a function returns more than one result, and why [`scanf`](/stdio/fn.scanf/) wants `&n` rather than `n`.

A common shape is "return a status, deliver the result through a pointer":

```c
#include <errno.h>
#include <limits.h>
#include <stdlib.h>

/* parse_int: convert all of s to an int in *out; return 0 on success, -1 on error */
int parse_int(const char *s, int *out)
{
    char *end;
    errno = 0;
    long v = strtol(s, &end, 10);
    if (end == s || *end != '\0' || errno == ERANGE || v < INT_MIN || v > INT_MAX)
        return -1;
    *out = (int)v;
    return 0;
}
```

## 5.3 Pointers and Arrays

Arrays and pointers are intimately related. Given

```c
double v[5] = { 1.5, 2.5, 3.5, 4.5, 5.5 };
double *p = &v[0];
```

`p` points to the first element. Adding an integer to a pointer moves it by that many **elements**, not bytes: `p + 1` points to `v[1]`, `p + i` to `v[i]`, and `*(p + i)` is the value `v[i]`. The scaling by element size is automatic.

Two rules tie the notations together:

1. In almost every expression, **an array's name converts to a pointer to its first element**. (The exceptions are `sizeof v`, `&v`, and a string literal initializing an array.) So `p = v;` is the same as `p = &v[0];`.
2. **`a[i]` is defined as `*(a + i)`.** That works whether `a` is an array or a pointer, so you can index pointers too: `p[3]` is `v[3]`.

An array, however, is not a pointer variable. You can assign to `p` or increment it; you can't do either to `v`.

When you pass an array to a function, the function actually receives a pointer to its first element. These two parameter declarations are identical:

```c
double average(const double a[], size_t n);
double average(const double *a, size_t n);
```

That has a consequence worth remembering: **inside the function, `sizeof a` is the size of a pointer**, not of the caller's array. Always pass the length separately.

```c
double average(const double *a, size_t n)
{
    double sum = 0;
    for (const double *end = a + n; a < end; a++)
        sum += *a;
    return n ? sum / n : 0;
}
```

To hand over part of an array, pass a pointer into the middle of it: `average(v + 2, 3)` averages `v[2]`, `v[3]` and `v[4]`.

## 5.4 Address Arithmetic

The pointer operations C allows are:

- adding an integer to, or subtracting one from, a pointer;
- subtracting two pointers into the **same** array, which gives the number of elements between them (type [`ptrdiff_t`](/stddef/type.ptrdiff_t/));
- comparing two pointers into the same array with `<`, `>`, etc.;
- comparing any pointer with `NULL`, and assigning pointers of compatible types.

A pointer may point **one past** the last element of an array (handy as an end marker) but must not be dereferenced there. Arithmetic that goes further outside the array, adding two pointers, or comparing pointers into unrelated objects is undefined or meaningless.

These operations are enough to build a simple **arena allocator**: one big block of memory from which small pieces are handed out by bumping a pointer forward, and which is released all at once. Compilers and games use this pattern because it's extremely fast.

```c
#include <stddef.h>
#include <stdlib.h>

struct arena {
    unsigned char *base;   /* start of the block */
    unsigned char *next;   /* first free byte */
    unsigned char *end;    /* one past the last byte */
};

int arena_init(struct arena *a, size_t capacity)
{
    a->base = a->next = malloc(capacity);
    a->end = a->base ? a->base + capacity : NULL;
    return a->base ? 0 : -1;
}

/* arena_alloc: n bytes aligned for any type, or NULL when the arena is full */
void *arena_alloc(struct arena *a, size_t n)
{
    size_t align = _Alignof(max_align_t);
    size_t used = (size_t)(a->next - a->base);
    size_t pad = (align - used % align) % align;
    size_t left = (size_t)(a->end - a->next);

    if (pad > left || n > left - pad)
        return NULL;
    void *p = a->next + pad;
    a->next += pad + n;
    return p;
}

void arena_reset(struct arena *a)   { a->next = a->base; }
void arena_destroy(struct arena *a) { free(a->base); }
```

Each step uses only legal pointer operations within the one block: subtracting to measure used and remaining space, adding to advance.

For individually freeable memory, use [`malloc`](/stdlib/fn.malloc/) and [`free`](/stdlib/fn.free/). Chapter 8 sketches how such an allocator can work inside.

## 5.5 Character Pointers and Functions

A string literal is an array of `char`; in an expression it becomes a pointer to its first character. Compare:

```c
char buffer[] = "draft";        /* an array of 6 chars, initialized from the literal */
const char *label = "draft";    /* a pointer to a read-only literal */
```

`buffer` is your own array: you can change its characters (`buffer[0] = 'D'`) but `buffer` always names the same storage. `label` is a pointer: you can point it at another string (`label = "final"`), but modifying the characters it points at is undefined, which is why it's declared `const char *`.

String functions are naturally written with pointers that walk along the characters. A few small examples:

```c
/* count_char: number of times c occurs in s */
size_t count_char(const char *s, char c)
{
    size_t n = 0;
    for (; *s; s++)
        if (*s == c)
            n++;
    return n;
}

/* starts_with: true if s begins with prefix */
bool starts_with(const char *s, const char *prefix)
{
    while (*prefix)
        if (*s++ != *prefix++)
            return false;
    return true;
}

/* to_upper_copy: copy src into dst (size cap) in upper case; always terminates */
void to_upper_copy(char *dst, const char *src, size_t cap)
{
    if (cap == 0)
        return;
    while (*src && cap-- > 1)
        *dst++ = toupper((unsigned char)*src++);
    *dst = '\0';
}
```

`*s++` deserves a careful look. Postfix `++` binds tighter than `*`, so it applies to `s`, but it yields the *old* value of `s`. The expression therefore means "the character `s` points at now; afterwards, advance `s`". It's one of the most common idioms in C.

Similar pairs worth recognizing:

```c
*top++ = value;   /* push onto a stack that grows upward */
value = *--top;   /* pop it back */
```

The library supplies the standard string functions in [`<string.h>`](/string/): [`strlen`](/string/fn.strlen/), [`strcpy`](/string/fn.strcpy/), [`strcmp`](/string/fn.strcmp/), [`strchr`](/string/fn.strchr/), [`strstr`](/string/fn.strstr/) and friends.

## 5.6 Pointer Arrays; Pointers to Pointers

Pointers are values, so they can be stored in arrays. An array of `char *` is the usual way to hold a list of strings of different lengths, and sorting such a list only moves pointers, never the text.

This program reads words from its input, stores each in its own `malloc`'d copy, sorts the pointers, and prints the words in order with duplicates removed:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXWORDS 10000

static int cmp_words(const void *a, const void *b)
{
    const char *const *x = a;
    const char *const *y = b;
    return strcmp(*x, *y);
}

int main(void)
{
    static char *words[MAXWORDS];
    char buf[100];
    size_t n = 0;

    while (n < MAXWORDS && scanf("%99s", buf) == 1) {
        words[n] = malloc(strlen(buf) + 1);
        if (words[n] == NULL) {
            perror("malloc");
            return 1;
        }
        strcpy(words[n++], buf);
    }

    qsort(words, n, sizeof words[0], cmp_words);

    for (size_t i = 0; i < n; i++) {
        if (i == 0 || strcmp(words[i], words[i - 1]) != 0)
            puts(words[i]);
    }
    for (size_t i = 0; i < n; i++)
        free(words[i]);
    return 0;
}
```

`char *words[MAXWORDS]` is an array of pointers to `char`. When an array like this is passed to a function, the function receives a pointer to its first element, which is a pointer to a pointer: `char **`. That's also why [`qsort`](/stdlib/fn.qsort/) hands our comparison function pointers to the *elements*, i.e. `char *const *` values that must be dereferenced once to reach the strings.

## 5.7 Multi-dimensional Arrays

C supports true rectangular arrays:

```c
double m[3][4];      /* 3 rows of 4 doubles, 12 doubles in one block */
m[1][2] = 7.0;
```

A two-dimensional array is an array whose elements are arrays. It's stored row by row (the last index changes fastest), and you index it as `m[i][j]`, never `m[i, j]` (that's the comma operator, and means `m[j]`).

Matrix multiplication is the classic workload:

```c
#define N 3

/* mat_mul: c = a * b, all N x N */
void mat_mul(double c[N][N], const double a[N][N], const double b[N][N])
{
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) {
            double sum = 0;
            for (int k = 0; k < N; k++)
                sum += a[i][k] * b[k][j];
            c[i][j] = sum;
        }
}
```

When a 2-D array is passed to a function, what's passed is a pointer to its first **row**, so the function must know the row length. All of these declare the same parameter:

```c
void show(double m[3][4]);
void show(double m[][4]);
void show(double (*m)[4]);    /* pointer to an array of 4 doubles */
```

The parentheses in the last one matter: `double *m[4]` would be an array of four pointers.

C99 lets the dimensions come from other parameters (**variable-length array** parameters), which makes general matrix code straightforward:

```c
void scale(size_t rows, size_t cols, double m[rows][cols], double k)
{
    for (size_t i = 0; i < rows; i++)
        for (size_t j = 0; j < cols; j++)
            m[i][j] *= k;
}
```

## 5.8 Initialization of Pointer Arrays

An array of pointers to string literals makes a compact lookup table. Its initializer is just the list of literals:

```c
/* weekday: name of day d (0 = Sunday), or "?" if out of range */
const char *weekday(int d)
{
    static const char *const names[] = {
        "Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday",
    };
    if (d < 0 || d >= (int)(sizeof names / sizeof names[0]))
        return "?";
    return names[d];
}
```

The compiler counts the initializers to size the array. `static` makes the table exist once rather than being rebuilt on each call; the two `const`s make both the pointers and the characters read-only. A trailing comma after the last element is allowed and makes adding entries tidier.

## 5.9 Pointers vs. Multi-dimensional Arrays

Compare these two declarations:

```c
char grid[4][10];   /* 4 x 10 = 40 chars in one block */
char *rows[4];      /* 4 pointers, pointing nowhere yet */
```

Both `grid[2][3]` and `rows[2][3]` are valid `char` expressions, but they're very different underneath. `grid` reserves all 40 characters up front, every row exactly 10 long. `rows` reserves only four pointers; each must be set to point at some storage, and each row can have a different length.

That flexibility is why arrays of pointers are the usual choice for collections of strings:

```c
const char *colors[] = { "red", "green", "ultramarine" };   /* rows of 4, 6 and 12 bytes */
const char colors2[][12] = { "red", "green", "ultramarine" }; /* 3 rows of 12 bytes */
```

## 5.10 Command-line Arguments

A program can receive arguments from the command that started it. Declare `main` with two parameters:

```c
int main(int argc, char *argv[])
```

`argc` is the number of arguments and `argv` an array of pointers to them, as strings. `argv[0]` is conventionally the program's name, so `argc` is at least 1, and `argv[argc]` is a null pointer.

This program prints its arguments, one per line, with their index:

```c
#include <stdio.h>

int main(int argc, char *argv[])
{
    for (int i = 0; i < argc; i++)
        printf("argv[%d] = \"%s\"\n", i, argv[i]);
    return 0;
}
```

```sh
$ ./args one "two words" 3
argv[0] = "./args"
argv[1] = "one"
argv[2] = "two words"
argv[3] = "3"
```

UNIX convention is that options start with `-` and come before other arguments. Here is a minimal `head` that prints the first lines of standard input, accepting `-n COUNT` and `-q` (quiet: suppress the trailing summary):

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char *argv[])
{
    long limit = 10;
    int quiet = 0;
    int i;

    for (i = 1; i < argc && argv[i][0] == '-'; i++) {
        if (strcmp(argv[i], "-q") == 0)
            quiet = 1;
        else if (strcmp(argv[i], "-n") == 0 && i + 1 < argc)
            limit = strtol(argv[++i], NULL, 10);
        else {
            fprintf(stderr, "usage: %s [-q] [-n COUNT]\n", argv[0]);
            return 2;
        }
    }

    char line[1024];
    long shown = 0;
    while (shown < limit && fgets(line, sizeof line, stdin) != NULL) {
        fputs(line, stdout);
        shown++;
    }
    if (!quiet)
        fprintf(stderr, "(%ld lines)\n", shown);
    return 0;
}
```

On POSIX systems, `getopt` (and GNU's `getopt_long`) handle option parsing in full generality.

## 5.11 Pointers to Functions

Functions aren't variables, but you can take a function's address and store it in a **function pointer**. That lets you pass behavior as an argument, store it in tables, and choose it at run time.

The declaration reads like the others: `int (*cmp)(const void *, const void *)` says that `*cmp` is a function taking two `const void *` and returning `int`, so `cmp` is a pointer to such a function. The parentheses around `*cmp` are essential; without them you'd be declaring a function that returns `int *`.

A small "map" over an array:

```c
void apply(double *a, size_t n, double (*f)(double))
{
    for (size_t i = 0; i < n; i++)
        a[i] = f(a[i]);
}

apply(samples, count, sqrt);     /* a function's name converts to a pointer to it */
apply(samples, count, fabs);
```

You may call through the pointer as `f(x)` or `(*f)(x)`; they mean the same.

[`qsort`](/stdlib/fn.qsort/) is the standard example of a function that takes a function. To sort records by different keys, write one comparison per key and pick one:

```c
struct student { char name[32]; int grade; };

static int by_name(const void *a, const void *b)
{
    const struct student *x = a, *y = b;
    return strcmp(x->name, y->name);
}

static int by_grade_desc(const void *a, const void *b)
{
    const struct student *x = a, *y = b;
    return (y->grade > x->grade) - (y->grade < x->grade);
}

qsort(class, n, sizeof class[0], sort_by_grade ? by_grade_desc : by_name);
```

The `(y > x) - (y < x)` form produces -1, 0 or 1 without the overflow risk of subtracting.

Arrays of function pointers make tidy dispatch tables:

```c
typedef int (*command_fn)(int argc, char **argv);

struct command { const char *name; command_fn run; };

static const struct command commands[] = {
    { "add",    cmd_add },
    { "list",   cmd_list },
    { "remove", cmd_remove },
};

for (size_t i = 0; i < sizeof commands / sizeof commands[0]; i++)
    if (strcmp(argv[1], commands[i].name) == 0)
        return commands[i].run(argc - 1, argv + 1);
```

## 5.12 Complicated Declarations

C declarations can get hard to read, especially when pointers, arrays and functions nest. The reliable method is to **start at the identifier and spiral outward**: look right for `[]` (array of) or `()` (function returning), then left for `*` (pointer to), and let parentheses override that order.

```c
int *a[8];
    /* a is an array of 8 pointers to int */
int (*b)[8];
    /* b is a pointer to an array of 8 ints */
int *c(void);
    /* c is a function returning a pointer to int */
int (*d)(void);
    /* d is a pointer to a function returning int */
int (*e[4])(double);
    /* e is an array of 4 pointers to functions taking double and returning int */
double (*f(int))[3];
    /* f is a function taking int and returning a pointer to an array of 3 doubles */
void (*g(void (*)(int)))(int);
    /* g takes a pointer to a function(int) and returns a pointer to a function(int) */
```

The last shape is exactly the standard [`signal`](/signal/fn.signal/) function. Naming the inner type with `typedef` (Chapter 6) makes it readable:

```c
typedef void (*handler_t)(int);
handler_t signal(int sig, handler_t h);
```

When in doubt, tools like `cdecl` translate between C declarations and English.
