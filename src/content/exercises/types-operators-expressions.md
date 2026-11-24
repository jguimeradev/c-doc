---
chapter: types-operators-expressions
summary: Type ranges, parsing, bit manipulation and overflow.
---

## Exercise 2-1 · How big is everything? <span class="diff easy">easy</span>

Print the minimum and maximum values of `signed char`, `short`, `int`, `long` and `long long`, and the maximum of each unsigned type, using [`<limits.h>`](/limits/). Also print `sizeof` for each type.

<details class="hint"><summary>Hint</summary>

Use the right `printf` length modifier for each type: `%d` for `int`-sized values, `%ld`/`%lu` for `long`, `%lld`/`%llu` for `long long`, `%zu` for `sizeof`.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("%-12s %3s %22s %22s\n", "type", "B", "min", "max");
    printf("%-12s %3zu %22d %22d\n", "signed char", sizeof(signed char), SCHAR_MIN, SCHAR_MAX);
    printf("%-12s %3zu %22d %22d\n", "short", sizeof(short), SHRT_MIN, SHRT_MAX);
    printf("%-12s %3zu %22d %22d\n", "int", sizeof(int), INT_MIN, INT_MAX);
    printf("%-12s %3zu %22ld %22ld\n", "long", sizeof(long), LONG_MIN, LONG_MAX);
    printf("%-12s %3zu %22lld %22lld\n", "long long", sizeof(long long), LLONG_MIN, LLONG_MAX);
    printf("%-12s %3zu %22d %22u\n", "unsigned", sizeof(unsigned), 0, UINT_MAX);
    printf("%-12s %3zu %22d %22lu\n", "unsigned l", sizeof(unsigned long), 0, ULONG_MAX);
    printf("%-12s %3zu %22d %22llu\n", "unsigned ll", sizeof(unsigned long long), 0, ULLONG_MAX);
    return 0;
}
```

`SCHAR_MIN` and `SHRT_MIN` are `int` expressions after promotion, so `%d` is correct for them.

</details>

## Exercise 2-2 · Parsing hexadecimal <span class="diff easy">easy</span>

Write `unsigned long parse_hex(const char *s)` that converts strings like `"ff"`, `"0x1A3"` or `"DEADbeef"` to their value. Stop at the first character that isn't a hex digit. Reuse `hex_value` from [section 2.7](/book/types-operators-expressions/#27-type-conversions).

<details class="hint"><summary>Hint</summary>

Skip an optional `0x` or `0X`, then accumulate `n = n * 16 + digit` while `hex_value` returns a non-negative number.

</details>

<details class="solution"><summary>Solution</summary>

```c
int hex_value(int c)
{
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

unsigned long parse_hex(const char *s)
{
    unsigned long n = 0;
    int d;

    if (s[0] == '0' && (s[1] == 'x' || s[1] == 'X'))
        s += 2;
    while ((d = hex_value(*s)) >= 0) {
        n = n * 16 + (unsigned long)d;
        s++;
    }
    return n;
}
```

Because `n` is unsigned, an over-long string wraps around rather than causing undefined behavior. [`strtoul`](/stdlib/fn.strtoul/) with base 16 does the same job and also reports overflow.

</details>

## Exercise 2-3 · Rotating bits <span class="diff medium">medium</span>

Write `uint32_t rotl32(uint32_t x, unsigned n)`, which rotates `x` left by `n` bits: bits shifted out on the left come back in on the right. It must work for every `n`, including 0 and values ≥ 32.

<details class="hint"><summary>Hint</summary>

The result is `(x << n) | (x >> (32 - n))`, but shifting a 32-bit value by 32 is undefined. Reduce `n` modulo 32 first, and handle `n == 0` (or use `(32 - n) & 31`).

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdint.h>

uint32_t rotl32(uint32_t x, unsigned n)
{
    n &= 31;
    return (x << n) | (x >> ((32 - n) & 31));
}
```

When `n` is 0, the right shift becomes `x >> 0` (because `32 & 31 == 0`), and `x | x == x`, which is correct. Modern compilers recognize this exact pattern and emit a single rotate instruction.

</details>

## Exercise 2-4 · Counting set bits <span class="diff medium">medium</span>

Write `int popcount(unsigned x)`, which returns the number of 1 bits in `x`, in two ways: first by testing each bit, then using the fact that `x & (x - 1)` clears the lowest set bit. Which is faster for sparse values?

<details class="hint"><summary>Hint</summary>

Version one shifts `x` right until it's zero, adding `x & 1` each time. Version two loops while `x != 0`, applying `x &= x - 1` and counting iterations; it runs once per **set** bit.

</details>

<details class="solution"><summary>Solution</summary>

```c
int popcount_shift(unsigned x)
{
    int n = 0;
    for (; x != 0; x >>= 1)
        n += x & 1u;
    return n;
}

int popcount_clear(unsigned x)
{
    int n = 0;
    for (; x != 0; x &= x - 1)
        n++;
    return n;
}
```

Why it works: subtracting 1 flips the lowest set bit to 0 and all the zeros below it to 1; AND-ing with the original then wipes out all of those positions. The second version loops once per set bit, so it's faster for sparse values. In practice, GCC and Clang provide `__builtin_popcount`, and C23 adds `stdc_count_ones` in `<stdbit.h>`.

</details>

## Exercise 2-5 · Powers of two <span class="diff medium">medium</span>

Write `bool is_pow2(unsigned x)` and `unsigned next_pow2(unsigned x)`, which returns the smallest power of two that is ≥ `x` (with `next_pow2(0) == 1`). No loops allowed in `is_pow2`.

<details class="hint"><summary>Hint</summary>

A power of two has exactly one set bit, so `x & (x - 1)` is zero for it. For `next_pow2`, decrement, then "smear" the highest set bit into every lower position with a series of `x |= x >> k`, then increment.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdbool.h>

bool is_pow2(unsigned x)
{
    return x != 0 && (x & (x - 1)) == 0;
}

unsigned next_pow2(unsigned x)    /* assumes 32-bit unsigned */
{
    if (x <= 1)
        return 1;
    x--;
    x |= x >> 1;
    x |= x >> 2;
    x |= x >> 4;
    x |= x >> 8;
    x |= x >> 16;
    return x + 1;
}
```

After the shifts, every bit below the highest set bit is 1, so adding 1 carries into the next power of two. Decrementing first makes exact powers of two map to themselves. (If `x` is greater than 2<sup>31</sup>, the result wraps to 0.)

</details>

## Exercise 2-6 · Checked addition <span class="diff hard">hard</span>

Signed overflow is undefined, so you can't detect it by doing the addition and looking at the result. Write `bool add_overflows(int a, int b)` that decides, **without overflowing**, whether `a + b` would overflow an `int`.

<details class="hint"><summary>Hint</summary>

Overflow can only happen when `a` and `b` have the same sign. If `b > 0`, it overflows exactly when `a > INT_MAX - b`. If `b < 0`, exactly when `a < INT_MIN - b`. Both right-hand sides are safe to compute.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <limits.h>
#include <stdbool.h>

bool add_overflows(int a, int b)
{
    if (b > 0)
        return a > INT_MAX - b;
    if (b < 0)
        return a < INT_MIN - b;
    return false;
}
```

C23 standardizes this as `ckd_add(&result, a, b)` in `<stdckdint.h>`, and GCC/Clang offer `__builtin_add_overflow`.

</details>
