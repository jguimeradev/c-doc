---
title: Types, Operators, and Expressions
number: "2"
order: 2
summary: The basic data objects of C and the operators that combine them.
---

Every value in a C program has a **type**, which fixes what values it can hold, how much memory it takes, and which operations apply to it. This chapter covers the built-in types, how to write constants of each, and the operators that build expressions out of them.

## 2.1 Variable Names

An identifier is a sequence of letters, digits and underscores that doesn't start with a digit. Upper and lower case are distinct, so `total`, `Total` and `TOTAL` are three different names.

A few rules of thumb:

- Avoid leading underscores. Identifiers beginning with `_` plus a capital letter, or with two underscores, belong to the compiler and library.
- Keywords (`int`, `return`, `while`, …) can't be used as names.
- Make a name's length match its reach: a loop index can be `i`, but a global used across files deserves something like `config_verbose`.

## 2.2 Data Types and Sizes

There are only a few fundamental types:

| Type | Purpose |
|---|---|
| `char` | one byte; big enough for any character in the basic character set |
| `int` | an integer of the size the machine handles most naturally |
| `float` | single-precision floating point |
| `double` | double-precision floating point |

Integer types come in several widths: `short`, `int`, `long` and (since C99) `long long`. The standard only guarantees minimum ranges and that each is at least as wide as the previous one:

| Type | Minimum width | Common today |
|---|---|---|
| `char` | 8 bits | 8 bits |
| `short` | 16 bits | 16 bits |
| `int` | 16 bits | 32 bits |
| `long` | 32 bits | 32 bits on Windows, 64 on Linux/macOS |
| `long long` | 64 bits | 64 bits |

Each integer type has a `signed` and an `unsigned` version. Unsigned types can't be negative, and their arithmetic wraps around modulo 2<sup>n</sup>; an 8-bit `unsigned char` spans 0 to 255. Plain `char` may be either signed or unsigned depending on the platform.

For extended precision there's `long double`.

The actual limits on your system are in [`<limits.h>`](/limits/) and [`<float.h>`](/float/). When you need a precise width, such as for a file format or a hash, use the fixed-width types from `<stdint.h>`: `uint8_t`, `int32_t`, `uint64_t` and so on.

`sizeof` reports how many bytes a type or object occupies:

```c
printf("long: %zu bytes, pointer: %zu bytes\n", sizeof(long), sizeof(void *));
```

C99 added a boolean type `_Bool`, usually written `bool` via `<stdbool.h>` (and a keyword in C23).

## 2.3 Constants

**Integers.** A plain number like `250` has type `int`. Suffixes pick other types: `250L` (`long`), `250U` (`unsigned`), `250ULL` (`unsigned long long`). A leading zero makes a number **octal** (`0755`), and `0x` makes it **hexadecimal** (`0xFF`). C23 adds binary (`0b1010`) and the digit separator `'` (`1'000'000`).

**Floating point.** A decimal point or exponent makes a floating constant: `2.5`, `1e6`, `3.0e-8`. These are `double` unless suffixed with `f` (`float`) or `L` (`long double`).

**Characters.** A character in single quotes is an integer constant equal to that character's code: `'A'` is 65 in ASCII. Special characters use escapes:

| Escape | Character | Escape | Character |
|---|---|---|---|
| `\n` | newline | `\\` | backslash |
| `\t` | horizontal tab | `\'` | single quote |
| `\r` | carriage return | `\"` | double quote |
| `\0` | null | `\a` | alert (bell) |
| `\b` | backspace | `\f` | form feed |
| `\v` | vertical tab | `\?` | question mark |
| `\ooo` | octal code | `\xhh` | hexadecimal code |

**Constant expressions** use only constants, so the compiler evaluates them ahead of time: `#define PAGE_BYTES (4 * 1024)`.

**String literals** are characters in double quotes. The compiler appends a hidden `'\0'`, so `"cat"` takes four bytes. Literals written next to each other are joined into one, which is handy for long text:

```c
const char *usage = "usage: convert [-v] input output\n"
                    "  -v   print progress\n";
```

Don't try to modify a string literal; the result is undefined.

**Enumerations** create named integer constants:

```c
enum color { RED, GREEN, BLUE };                 /* 0, 1, 2 */
enum http_status { OK = 200, CREATED, ACCEPTED, NOT_FOUND = 404 };
                                                  /* 200, 201, 202, 404 */
```

Each unspecified value is one more than the previous. Enums keep related constants together, and debuggers display their names instead of raw numbers.

## 2.4 Declarations

A declaration states a type and introduces one or more names:

```c
int width, height;
double ratio;
char name[64];
```

You may initialize at the point of declaration:

```c
int retries = 3;
char sep = ',';
double tolerance = 1e-9;
```

Global and `static` variables begin at zero if not initialized, and their initializers must be constant expressions. Local variables are set up each time their block is entered; **if not initialized, their contents are unpredictable**, and using them is a bug that sanitizers and `-Wall` can help catch.

`const` marks something as read-only:

```c
const int max_users = 500;
size_t count_vowels(const char *text);   /* promises not to modify text */
```

## 2.5 Arithmetic Operators

The arithmetic operators are `+`, `-`, `*`, `/` and `%`. For integers, `/` discards any fraction (rounding toward zero), and `%` gives the remainder, whose sign follows the left operand. `%` only works on integers; use [`fmod`](/math/fn.fmod/) for floating-point values.

```c
int minutes = 135;
printf("%d h %02d min\n", minutes / 60, minutes % 60);   /* 2 h 15 min */
```

`*`, `/` and `%` bind tighter than `+` and `-`; all of them associate left to right.

<div class="warning">

If a **signed** integer computation overflows, the behavior is undefined: the compiler is allowed to assume it never happens and optimize accordingly. Unsigned arithmetic is different: it is defined to wrap around.

</div>

## 2.6 Relational and Logical Operators

The comparisons `<`, `<=`, `>`, `>=` bind tighter than `==` and `!=`, and all of them bind looser than arithmetic. So `a + b < limit` means `(a + b) < limit`.

`&&` (and) and `||` (or) evaluate their left operand first and only evaluate the right one if it can still change the outcome. That ordering guarantee lets you write guards like these:

```c
if (p != NULL && p->count > 0)        /* p->count only touched when p is valid */
    use(p);

if (n == 0 || total / n > threshold)  /* never divides by zero */
    warn();
```

A comparison or logical expression produces `1` for true and `0` for false. Conversely, any nonzero value is treated as true in a condition. `!` flips truth: `!x` is `1` when `x` is `0`, and `0` otherwise.

## 2.7 Type Conversions

When an operator gets operands of different types, C converts them to a common type first. Usually the narrower type is widened, so nothing is lost: in `n * 2.5`, an `int n` becomes a `double`.

Because a `char` is just a small integer, you can do arithmetic with characters. Converting a hex digit to its value is a good example:

```c
/* hex_value: value of hex digit c, or -1 if c isn't one */
int hex_value(int c)
{
    if (c >= '0' && c <= '9')
        return c - '0';
    if (c >= 'a' && c <= 'f')
        return c - 'a' + 10;
    if (c >= 'A' && c <= 'F')
        return c - 'A' + 10;
    return -1;
}
```

A simplified version of the "usual arithmetic conversions":

1. If either operand is `long double`, `double` or `float`, the other is converted to the widest of those present.
2. Otherwise **integer promotion** happens first: `char` and `short` become `int`.
3. Then the lower-ranked integer type is converted to the higher one (`int` → `long` → `long long`).
4. If one operand is signed and the other unsigned of the same rank, the signed one becomes unsigned. This produces surprises: `-1 > 0u` is **true**, because `-1` turns into a huge unsigned value. `-Wsign-compare` flags these.

Assignment converts the right side to the left side's type. Narrowing to a smaller unsigned type keeps the low bits; narrowing a floating value to an integer truncates toward zero.

Arguments to a prototyped function are converted to the parameter types. Arguments passed through `...` get the *default promotions*: `float` → `double`, small integers → `int`.

You can force a conversion with a **cast**, `(type) expression`:

```c
int hits = 3, tries = 4;
double rate = (double)hits / tries;   /* 0.75; without the cast it would be 0 */
```

## 2.8 Increment and Decrement Operators

`++` adds one and `--` subtracts one. Placed **before** the variable (`++i`) the value is changed first and the new value is used; placed **after** (`i++`) the old value is used and then the variable changes.

```c
int i = 10;
int a = i++;   /* a == 10, i == 11 */
int b = --i;   /* b == 10, i == 10 */
```

When the result isn't used, as in `i++;` on its own line, the two forms do the same thing. The postfix form shines when filling an array:

```c
/* keep_digits: remove every non-digit from s, in place */
void keep_digits(char *s)
{
    char *out = s;
    for (; *s != '\0'; s++)
        if (*s >= '0' && *s <= '9')
            *out++ = *s;
    *out = '\0';
}
```

<div class="warning">

Changing a variable twice in one expression, or changing it while also reading it elsewhere in the expression, is undefined: `x = x++ + 1;` and `v[k] = k++;` have no reliable meaning.

</div>

## 2.9 Bitwise Operators

These operate on the individual bits of integers. They're easiest to reason about on unsigned values.

| Operator | Meaning |
|---|---|
| `&` | AND: bit is 1 only where both operands have 1 |
| `\|` | OR: bit is 1 where either operand has 1 |
| `^` | XOR: bit is 1 where the operands differ |
| `~` | complement: flips every bit |
| `<<` | shift left; vacated bits become 0 |
| `>>` | shift right; for unsigned values, vacated bits become 0 |

The usual idioms, for a bit position `n`:

```c
flags |=  (1u << n);    /* set bit n */
flags &= ~(1u << n);    /* clear bit n */
flags ^=  (1u << n);    /* toggle bit n */
if (flags & (1u << n))  /* test bit n */
    ...;
```

Packing and unpacking fields works the same way. A 16-bit RGB565 color stores 5 bits of red, 6 of green and 5 of blue:

```c
#include <stdint.h>

uint16_t rgb565(unsigned r, unsigned g, unsigned b)   /* inputs 0-255 */
{
    return (uint16_t)(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3));
}

unsigned red_of(uint16_t c)   { return (c >> 11) & 0x1F; }
unsigned green_of(uint16_t c) { return (c >> 5)  & 0x3F; }
unsigned blue_of(uint16_t c)  { return  c        & 0x1F; }
```

Don't mix up `&` (bitwise) with `&&` (logical): `4 & 2` is `0`, while `4 && 2` is `1`. Shifting by a negative count, or by at least the width of the type, is undefined.

## 2.10 Assignment Operators and Expressions

Updating a variable in terms of itself is so common that there's a shorthand: `total += price;` means `total = total + price;`. The same goes for `-=`, `*=`, `/=`, `%=`, `<<=`, `>>=`, `&=`, `^=` and `|=`.

The whole right-hand side is computed first: `x *= a + b` is `x = x * (a + b)`. A compound assignment also evaluates its left side only once, which matters for expressions like `histogram[bucket(v)] += 1`.

Since assignment yields the assigned value, assignments can sit inside other expressions, as in `while ((ch = getchar()) != EOF)`.

## 2.11 Conditional Expressions

`cond ? a : b` picks one of two values: it evaluates `cond`, then evaluates and yields `a` if `cond` is nonzero, `b` otherwise. Only the chosen branch is evaluated.

```c
int larger = (x > y) ? x : y;

printf("%zu file%s copied\n", n, (n == 1) ? "" : "s");

const char *label = (temp < 0) ? "freezing" : (temp < 20) ? "cool" : "warm";
```

Use it for short choices between values; for anything with side effects or more than two branches, an `if` is clearer.

## 2.12 Precedence and Order of Evaluation

Higher rows bind more tightly. Within a row, operators associate in the direction shown.

| Operators | Associativity |
|---|---|
| `()` `[]` `->` `.` postfix `++` `--` | left to right |
| `!` `~` prefix `++` `--` unary `+` `-` `*` `&` `(type)` `sizeof` | right to left |
| `*` `/` `%` | left to right |
| `+` `-` | left to right |
| `<<` `>>` | left to right |
| `<` `<=` `>` `>=` | left to right |
| `==` `!=` | left to right |
| `&` | left to right |
| `^` | left to right |
| `\|` | left to right |
| `&&` | left to right |
| `\|\|` | left to right |
| `?:` | right to left |
| `=` `+=` `-=` and the other assignments | right to left |
| `,` | left to right |

A trap worth memorizing: `&`, `^` and `|` sit **below** `==`. Writing `if (mode & WRITE_BIT == 0)` actually tests `mode & (WRITE_BIT == 0)`. Parenthesize: `if ((mode & WRITE_BIT) == 0)`.

Precedence decides how an expression is *grouped*, not the order its parts are *computed*. Apart from `&&`, `||`, `?:` and the comma operator, C leaves the evaluation order of operands unspecified. In `f() - g()`, either call might happen first; function arguments are likewise evaluated in an unspecified order. Code like this is broken:

```c
show(next_token(), next_token());   /* which token is first? unspecified */
```

Split it so the order is explicit:

```c
Token first = next_token();
Token second = next_token();
show(first, second);
```
