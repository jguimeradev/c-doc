---
title: Reference Manual
number: "A"
order: 9
summary: A compact reference to the C language itself — lexical rules, types, expressions, declarations, statements and the preprocessor.
---

This appendix summarizes the language, as opposed to its library. It is a reader's guide rather than a formal specification. The authoritative definition is the ISO C standard (ISO/IEC 9899); the final public drafts, such as N3220 for C23, are freely available and very close to the published text.

Notes on revisions (see [Appendix C](/book/gcc-and-standards/#c4-the-versions-of-c) for the full story): **C89/C90** is ANSI C; **C99** added `//` comments, `long long`, `bool`, declarations anywhere, designated initializers, compound literals and VLAs; **C11** added `_Generic`, `_Static_assert`, anonymous structs and unions, `_Alignas`, threads and atomics; **C17** was a bug-fix release; **C23** added `nullptr`, `true`/`false`/`bool` as keywords, `constexpr`, `typeof`, `[[attributes]]`, binary literals and digit separators, and removed old-style (K&R) function definitions.

## A.1 Lexical Conventions

A program is translated in phases: physical source characters are mapped to the source character set; backslash-newline pairs are deleted (splicing lines); the text is split into **preprocessing tokens** and white space; preprocessing directives are executed and macros expanded; escape sequences in character constants and string literals are converted; adjacent string literals are concatenated; and finally the tokens are compiled and linked.

There are six classes of tokens: **identifiers**, **keywords**, **constants**, **string literals**, **operators** and **punctuators**. White space (blanks, tabs, newlines, form feeds and comments) separates tokens but is otherwise ignored. The compiler always takes the longest sequence of characters that could form a token, so `a+++b` is `a ++ + b`.

**Comments** are `/* … */` (not nestable) and, since C99, `//` to end of line.

**Identifiers** consist of letters, digits and `_`, not starting with a digit; case is significant. At least the first 63 characters of internal names and 31 of external names are significant.

**Keywords** (C23 list; older ones in parentheses where the spelling changed):

```text
alignas  alignof  auto  bool  break  case  char  const  constexpr  continue
default  do  double  else  enum  extern  false  float  for  goto  if  inline
int  long  nullptr  register  restrict  return  short  signed  sizeof  static
static_assert  struct  switch  thread_local  true  typedef  typeof  typeof_unqual
union  unsigned  void  volatile  while  _Atomic  _BitInt  _Complex  _Decimal32
_Decimal64  _Decimal128  _Generic  _Imaginary  _Noreturn
```

(Before C23, `alignas`, `alignof`, `bool`, `static_assert` and `thread_local` were spelled `_Alignas`, `_Alignof`, `_Bool`, `_Static_assert` and `_Thread_local`, with lower-case macros in headers.)

**Constants:**

| Kind | Examples | Notes |
|---|---|---|
| decimal integer | `42`, `42u`, `42L`, `42ull` | type is the first of `int`, `long`, `long long` (or unsigned variants) that fits |
| octal / hex / binary | `052`, `0x2A`, `0b101010` | binary is C23 |
| floating | `3.0`, `.5`, `1e-3`, `2.5f`, `1.0L`, `0x1.8p3` | `double` unless suffixed; hex floats are C99 |
| character | `'a'`, `'\n'`, `'\x41'`, `L'x'`, `u8'a'` | plain character constants have type `int` |
| enumeration | names declared in an `enum` | type `int` (or the enum's fixed underlying type in C23) |

**String literals** are `"…"`, with prefixes `u8`, `u`, `U` and `L` for UTF-8, UTF-16, UTF-32 and wide strings. A literal has static storage duration and type "array of `char`" (one longer than the visible characters, for the `'\0'`); modifying it is undefined.

## A.2 Types

**Object types** describe values stored in memory; **function types** describe functions.

*Basic types:*

- `char`, `signed char`, `unsigned char` (three distinct types; `char` has the same range as one of the others);
- signed integer types `short`, `int`, `long`, `long long`, and their unsigned counterparts;
- `bool` (`_Bool`), holding `0` or `1`;
- floating types `float`, `double`, `long double`, plus optional `_Complex` versions;
- enumerated types;
- `void`, an incomplete type with no values.

*Derived types* are built from others:

- **arrays** of `N` objects of a type;
- **functions** returning a type and taking parameters;
- **pointers** to objects or functions;
- **structures**: members in sequence, each with its own storage;
- **unions**: members overlapping in the same storage;
- **atomic** types (`_Atomic`, C11).

*Qualifiers* add properties: `const` (not modified through this name), `volatile` (may change in ways the compiler can't see; every access must really happen), `restrict` (on pointers: the only way the object is accessed in this scope, enabling optimizations).

**Storage duration** is how long an object lives: *static* (whole program: externals and `static` locals), *automatic* (until the block exits: ordinary locals), *allocated* (from `malloc` until `free`), and *thread* (C11 `thread_local`).

**Linkage** decides whether the same name in different scopes or files refers to the same thing: *external* (shared across files, the default for file-scope names), *internal* (`static` at file scope: private to the file), or *none* (locals).

## A.3 Conversions

- **Integer promotions.** In arithmetic, `char`, `short`, `bool`, bit-fields and enums are converted to `int` if it can represent all their values, otherwise to `unsigned int`.
- **Usual arithmetic conversions.** For binary operators: if either operand is floating, both become the widest floating type present. Otherwise, after promotion, if both have the same signedness the lower rank converts to the higher; if the unsigned operand has rank ≥ the signed one, the signed converts to unsigned; otherwise, if the signed type can represent all the unsigned type's values, the unsigned converts to signed; otherwise both become the unsigned version of the signed type.
- **Integer to integer.** To an unsigned type: reduce modulo 2<sup>N</sup>. To a signed type that can't hold the value: implementation-defined (or a signal).
- **Floating to integer.** Truncates toward zero; undefined if the result doesn't fit.
- **Arrays and functions.** An expression of array type becomes a pointer to its first element, and a function designator becomes a pointer to the function, except as the operand of `sizeof`, `&`, or (for arrays) when a string literal initializes an array.
- **Pointers.** `void *` converts to and from any object pointer type implicitly. The integer constant `0` (or `NULL`, or `nullptr`) converts to a null pointer of any type. Other pointer/integer and pointer/pointer conversions need a cast, and many have implementation-defined or undefined results.

## A.4 Expressions

Operators are listed from highest to lowest precedence.

| Category | Operators | Associativity |
|---|---|---|
| postfix | `a[i]` `f(args)` `s.m` `p->m` `x++` `x--` `(type){init}` | left |
| unary | `++x` `--x` `&x` `*p` `+x` `-x` `~x` `!x` `sizeof` `alignof` `(type)x` | right |
| multiplicative | `*` `/` `%` | left |
| additive | `+` `-` | left |
| shift | `<<` `>>` | left |
| relational | `<` `>` `<=` `>=` | left |
| equality | `==` `!=` | left |
| bitwise AND | `&` | left |
| bitwise XOR | `^` | left |
| bitwise OR | `\|` | left |
| logical AND | `&&` | left |
| logical OR | `\|\|` | left |
| conditional | `?:` | right |
| assignment | `=` `*=` `/=` `%=` `+=` `-=` `<<=` `>>=` `&=` `^=` `\|=` | right |
| comma | `,` | left |

Key semantic rules:

- **Lvalues.** An lvalue designates an object; assignment and `++`/`--` require a modifiable lvalue. `&` requires an lvalue (or function designator) that isn't a bit-field or `register`.
- **Sequencing.** `&&`, `||`, `?:` and `,` evaluate their left operand completely first. There's also a sequence point before a function is called (after its arguments are evaluated) and at the end of each full expression. Otherwise the order of evaluation is unspecified, and modifying an object twice, or modifying and reading it, without sequencing is undefined.
- **Integer division** truncates toward zero, and `(a/b)*b + a%b == a`. Division or remainder by zero is undefined.
- **Shifts** by a negative amount or by ≥ the width of the promoted left operand are undefined; left-shifting a negative value, or a positive one into the sign bit, is undefined.
- **Pointer arithmetic** is defined only within an array object (including one past the end).
- **`sizeof`** yields a `size_t` and doesn't evaluate its operand (except for VLAs).
- **`_Generic(expr, type: value, …)`** (C11) selects an expression based on the type of `expr`, at compile time.

## A.5 Declarations

A declaration has *specifiers* followed by a list of *declarators*:

```text
storage-class  type-qualifiers  type-specifier   declarator [= initializer], ...;
static         const            unsigned long    *table[16] = { 0 };
```

- **Storage-class specifiers:** `typedef`, `extern`, `static`, `auto`, `register`, `thread_local`, `constexpr` (C23).
- **Type specifiers:** basic type keywords, `struct`/`union`/`enum` specifiers, typedef names, `typeof(…)` (C23).
- **Function specifiers:** `inline`, `_Noreturn`.
- **Alignment specifier:** `alignas(…)`.

A **declarator** names the identifier and wraps it in pointer (`*`), array (`[n]`) and function (`(params)`) derivations, with parentheses for grouping. Postfix `[]` and `()` bind more tightly than prefix `*`.

```c
int *a[3];           /* array of 3 pointers to int */
int (*b)[3];         /* pointer to array of 3 int */
int (*c)(int);       /* pointer to function (int) returning int */
```

**Structures and unions:**

```text
struct tag { member-declarations } ;
union  tag { member-declarations } ;
```

Members may be bit-fields (`unsigned flag : 1;`). The last member of a structure may be a **flexible array member** (`char data[];`), whose size comes from how much memory you allocate.

**Enumerations:** `enum tag { NAME [= constant-expression], … };` (C23 allows a fixed underlying type: `enum e : unsigned char { … }`).

**Initializers** may be a single expression or a brace-enclosed list, optionally with designators (`.member =` or `[index] =`). Members and elements not mentioned are zero-initialized. Objects with static storage duration need constant initializers.

**Type names** (for casts, `sizeof` and function prototypes) are declarations with the identifier omitted: `int *`, `int (*)[3]`, `void (*)(int)`.

**`typedef`** declares a name for a type and creates no new type.

**Static assertions:** `static_assert(constant-expression, "message");` fails compilation if the expression is zero.

## A.6 Statements

```text
labeled:      identifier : statement
              case constant-expression : statement
              default : statement
compound:     { declarations-and-statements }
expression:   expression(opt) ;
selection:    if ( expression ) statement
              if ( expression ) statement else statement
              switch ( expression ) statement
iteration:    while ( expression ) statement
              do statement while ( expression ) ;
              for ( init(opt) ; expression(opt) ; expression(opt) ) statement
jump:         goto identifier ;
              continue ;
              break ;
              return expression(opt) ;
```

- The controlling expression of `if`, `while`, `do` and `for` must have scalar type; it's compared against zero.
- The `switch` expression must have integer type; `case` labels must be distinct integer constant expressions; control falls through between cases.
- The `for` initializer may be a declaration, whose scope is the loop.
- `goto` must not jump into the scope of a variable-length array.

## A.7 External Definitions

A translation unit (a source file after preprocessing) is a sequence of declarations. Those at file scope with external linkage are visible to other translation units.

A **function definition** has the form:

```c
static inline int clamp(int x, int lo, int hi)   /* specifiers, declarator */
{                                                /* body */
    return x < lo ? lo : x > hi ? hi : x;
}
```

Old-style ("K&R") definitions that declare parameter types between the parenthesis and the brace, `int f(a, b) int a, b; { … }`, were obsolescent since C89 and removed in C23.

For each object or function with external linkage that is actually used, there must be exactly one **external definition** in the whole program. A file-scope object declaration without an initializer and without `extern` is a *tentative definition*; if no real definition follows in the file, it becomes a definition with a zero initializer.

`main` must be defined as `int main(void)` or `int main(int argc, char *argv[])` (or equivalent) in a hosted environment. Reaching the closing `}` of `main` returns `0`.

## A.8 Preprocessing

Directives begin with `#` as the first non-blank character of a line.

| Directive | Effect |
|---|---|
| `#define NAME text` | object-like macro |
| `#define NAME(params) text` | function-like macro; `...` and `__VA_ARGS__` for variadic macros |
| `#undef NAME` | remove a macro |
| `#include <file>` / `#include "file"` | insert a file |
| `#if expr` / `#elif expr` / `#else` / `#endif` | conditional inclusion; `defined(NAME)` usable in `expr` |
| `#ifdef NAME` / `#ifndef NAME` | shorthand for `#if defined` / `#if !defined` |
| `#elifdef` / `#elifndef` | C23 |
| `#line n "file"` | change the reported line number and file name |
| `#error message` / `#warning message` | stop compilation / warn (`#warning` is C23) |
| `#pragma …` | implementation-defined; `_Pragma("…")` operator form |
| `#embed <file>` | C23: include a file's bytes as an initializer list |

In a macro body, `#param` stringizes an argument and `a ## b` pastes tokens. A macro isn't re-expanded inside its own expansion, so recursive macros don't loop.

**Predefined macros** include `__FILE__`, `__LINE__`, `__DATE__`, `__TIME__`, `__STDC__` (1 on conforming implementations), `__STDC_VERSION__` (`199901L`, `201112L`, `201710L`, `202311L`) and `__STDC_HOSTED__`. Inside a function, `__func__` is the function's name as a string.

## A.9 Undefined Behavior: A Short List

These are among the most common sources of undefined behavior. A program that triggers any of them has no guaranteed meaning at all.

- Accessing an array out of bounds, or dereferencing a null, dangling or misaligned pointer.
- Using an object after its lifetime has ended (after `free`, or a local after its function returns).
- Reading an uninitialized automatic variable.
- Signed integer overflow; shifting by an invalid amount; dividing by zero.
- Modifying an object twice (or modifying and reading it) between sequence points.
- Modifying a string literal or a `const` object.
- Accessing an object through a pointer of an incompatible type (the *strict aliasing* rule; `char` access is always permitted).
- Calling a function through a pointer of the wrong type; returning without a value from a non-`void` function whose result is used.
- Mismatched `printf`/`scanf` formats and arguments.

Compile with `-Wall -Wextra` and test with `-fsanitize=address,undefined` to catch many of these.
