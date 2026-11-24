---
chapter: functions-program-structure
summary: Modules with private state, parsing, recursion and macros.
---

## Exercise 4-1 · Extending the ring buffer <span class="diff easy">easy</span>

Add `double rb_min(void)` and `double rb_max(void)` to the ring buffer module from [section 4.3](/book/functions-program-structure/#43-external-variables), without making its variables visible to other files.

<details class="hint"><summary>Hint</summary>

The new functions go in `ringbuf.c`, where `items`, `head` and `size` are already in scope. Declare them in `ringbuf.h`. Walk the stored items the same way `rb_mean` does.

</details>

<details class="solution"><summary>Solution</summary>

Add to `ringbuf.h`:

```c
double rb_min(void);
double rb_max(void);
```

and to `ringbuf.c`:

```c
double rb_min(void)
{
    double m = items[head];
    for (int i = 1; i < size; i++) {
        double v = items[(head + i) % CAPACITY];
        if (v < m)
            m = v;
    }
    return m;      /* meaningless when size == 0; callers should check rb_size() */
}

double rb_max(void)
{
    double m = items[head];
    for (int i = 1; i < size; i++) {
        double v = items[(head + i) % CAPACITY];
        if (v > m)
            m = v;
    }
    return m;
}
```

</details>

## Exercise 4-2 · Compound durations <span class="diff medium">medium</span>

Extend `to_seconds` from [section 4.2](/book/functions-program-structure/#42-functions-returning-non-integers) to accept `d` for days and compound values like `"1h30m"` or `"2d4h"`. Return −1 for anything malformed, including an empty string.

<details class="hint"><summary>Hint</summary>

Loop: parse a number with [`strtod`](/stdlib/fn.strtod/), look at the unit character after it, add the scaled value to a total, and continue from the character after the unit. A bare number is only allowed as the last (or only) part.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdlib.h>

double to_seconds(const char *text)
{
    double total = 0;
    int parts = 0;

    while (*text != '\0') {
        char *unit;
        double v = strtod(text, &unit);
        if (unit == text || v < 0)
            return -1;
        double scale;
        switch (*unit) {
        case 'd':  scale = 86400; break;
        case 'h':  scale = 3600;  break;
        case 'm':  scale = 60;    break;
        case 's':  scale = 1;     break;
        case '\0': scale = 1;     break;   /* bare number at the end: seconds */
        default:   return -1;
        }
        total += v * scale;
        parts++;
        text = (*unit == '\0') ? unit : unit + 1;
    }
    return parts > 0 ? total : -1;
}
```

One subtlety: `strtod` accepts exponents, so `"1e2s"` is 100 seconds. Whether that's a bug or a feature is up to you.

</details>

## Exercise 4-3 · Binary, recursively <span class="diff easy">easy</span>

Write a recursive `void print_binary(unsigned n)` that prints `n` in base 2 with no leading zeros (and `"0"` for zero).

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

void print_binary(unsigned n)
{
    if (n > 1)
        print_binary(n / 2);    /* print the higher bits first */
    putchar('0' + (int)(n % 2));
}
```

The recursion depth is at most the number of bits in `unsigned`, so there's no risk of stack overflow.

</details>

## Exercise 4-4 · A safe SWAP macro <span class="diff medium">medium</span>

Write a macro `SWAP(type, a, b)` that exchanges two variables of the given type. Then explain why it should be wrapped in `do { … } while (0)`.

<details class="hint"><summary>Hint</summary>

Think about what happens when the macro is used as the body of an `if` that has an `else`, with a semicolon after the macro call.

</details>

<details class="solution"><summary>Solution</summary>

```c
#define SWAP(type, a, b)       \
    do {                       \
        type swap_tmp_ = (a);  \
        (a) = (b);             \
        (b) = swap_tmp_;       \
    } while (0)
```

If the macro were just a `{ … }` block, then

```c
if (x > y)
    SWAP(int, x, y);
else
    ...
```

would expand to `if (x > y) { … }; else …`, and the stray `;` ends the `if` statement, making the `else` a syntax error. `do { … } while (0)` is a single statement that *requires* the trailing semicolon, so the macro behaves like a function call everywhere.

The odd name `swap_tmp_` reduces the chance of colliding with one of the arguments: `SWAP(int, tmp, x)` would break if the temporary were called `tmp`.

</details>

## Exercise 4-5 · Fast exponentiation <span class="diff medium">medium</span>

Write `double ipow(double x, unsigned n)` that computes x<sup>n</sup> with O(log n) multiplications, using the identities x<sup>2k</sup> = (x<sup>k</sup>)² and x<sup>2k+1</sup> = x · x<sup>2k</sup>. Write it recursively first, then iteratively.

<details class="solution"><summary>Solution</summary>

```c
double ipow_rec(double x, unsigned n)
{
    if (n == 0)
        return 1.0;
    double half = ipow_rec(x, n / 2);
    return (n % 2) ? x * half * half : half * half;
}

double ipow(double x, unsigned n)
{
    double result = 1.0;
    while (n > 0) {
        if (n & 1u)
            result *= x;    /* this bit of n contributes x^(2^k) */
        x *= x;
        n >>= 1;
    }
    return result;
}
```

The iterative version reads the bits of `n` from least significant up, squaring `x` at each step, so `x` holds x<sup>2<sup>k</sup></sup> at step k. The same technique, done modulo a number, is the core of RSA encryption.

</details>

## Exercise 4-6 · Splitting a program into files <span class="diff medium">medium</span>

Split the statistics tool from [section 4.1](/book/functions-program-structure/#41-basics-of-functions) into `main.c`, `stats.c` and `stats.h`, with `read_number` private to `main.c`. Write a `Makefile` that rebuilds only what changed.

<details class="hint"><summary>Hint</summary>

`struct stats`, `add_sample` and `report` form the module, so their declarations (and the struct definition, since `main` creates one) go in `stats.h`. `read_number` is only used by `main`, so make it `static` there.

</details>

<details class="solution"><summary>Solution</summary>

`stats.h`:

```c
#ifndef STATS_H
#define STATS_H

struct stats {
    long count;
    double sum, min, max;
};

void add_sample(struct stats *s, double x);
void report(const struct stats *s);

#endif
```

`stats.c` includes `"stats.h"` and `<stdio.h>` and contains `add_sample` and `report` unchanged. `main.c` includes `"stats.h"`, `<stdio.h>` and `<stdlib.h>`, and defines `static int read_number(double *out)` and `main`.

`Makefile` (the indented lines must start with a **tab**):

```make
CFLAGS = -std=c17 -Wall -Wextra -g

stats: main.o stats.o
	$(CC) $(CFLAGS) -o $@ main.o stats.o

main.o: main.c stats.h
stats.o: stats.c stats.h

clean:
	rm -f stats *.o
```

`make` already knows how to build `x.o` from `x.c`; the two dependency lines just add the header, so that editing `stats.h` rebuilds both objects but editing `main.c` rebuilds only `main.o`.

</details>
