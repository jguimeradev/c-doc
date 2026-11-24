---
title: calc — an expression calculator
order: 4
summary: A tokenizer and recursive-descent parser that evaluates arithmetic with precedence, variables and functions.
level: intermediate
chapters: [functions-program-structure, pointers-arrays, structures]
skills: [tokenizing, recursive descent, error handling, function-pointer tables]
---

## Overview

`calc` reads arithmetic expressions written the normal way, with operator precedence and parentheses, and evaluates them. Along the way you'll write a **tokenizer** and a **recursive-descent parser**, the same technique used in many real compilers.

```console
$ ./calc
> 2 + 3 * 4
14
> (2 + 3) * 4
20
> r = 2.5
2.5
> pi * r ^ 2
19.6349540849
> sqrt(16) + max(3, 7)
11
> 1 / 0
error: division by zero
> 3 +
error: expected a number, variable or '(' at column 4
```

## What you'll practice

- turning a string into tokens with a small state machine;
- writing one function per grammar rule, with recursion handling nesting;
- precedence and associativity (`^` is right-associative: `2^3^2` is 512);
- error reporting with positions, and recovering for the next line;
- a symbol table for variables ([section 6.6](/book/structures/#66-table-lookup), or a simple array);
- a table of built-in functions using function pointers ([section 5.11](/book/pointers-arrays/#511-pointers-to-functions)).

## Grammar

```text
statement  := IDENT '=' expr | expr
expr       := term   (('+' | '-') term)*
term       := unary (('*' | '/' | '%') unary)*
unary      := '-' unary | power
power      := primary ('^' unary)?          -- right-associative
primary    := NUMBER | IDENT | IDENT '(' args ')' | '(' expr ')'
args       := expr (',' expr)*
```

Each rule becomes one function. Lower rules bind more tightly, which is where precedence comes from.

## Milestones

### 1. Tokenizer

Write `struct token next_token(struct lexer *lx)` returning numbers (use [`strtod`](/stdlib/fn.strtod/)), identifiers (letters, digits, `_`), single-character operators, and an `END` token. Record each token's column for error messages. Test it alone by printing the tokens of a line.

### 2. Numbers and + − × ÷

Implement `expr`, `term` and `primary` for numbers and parentheses. Use a one-token lookahead: the parser always holds the current token and calls `advance()` to move on.

### 3. Unary minus, power, modulo

Add `unary` and `power`, and make `term` call `unary`. Check that `-2^2` is `-4` (power binds tighter than unary minus), that `2^3^2` is `512` (the exponent is parsed by recursing into `unary`, which makes `^` right-associative), and that `2^-1` is `0.5`.

### 4. Errors

On error, report the column and skip the rest of the line. A clean way is [`setjmp`/`longjmp`](/setjmp/macro.setjmp/): call `setjmp` before parsing each line, and have the error function `longjmp` back. Division by zero should also be an error rather than printing `inf`.

### 5. Variables and functions

Store variables in a table of `{name, value}` pairs. Predefine `pi` and `e`. Add a table of built-ins:

```c
struct builtin { const char *name; int arity; double (*fn1)(double); double (*fn2)(double, double); };
```

with `sqrt`, `sin`, `cos`, `log`, `abs` (via [`fabs`](/math/fn.fabs/)), `min`, `max`, `pow`.

## Starter code

```c
#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

enum kind { T_NUM, T_IDENT, T_OP, T_END };

struct token {
    enum kind kind;
    double num;
    char text[32];
    int col;
};

static const char *src;     /* the line being parsed */
static const char *pos;     /* current position in it */
static struct token tok;    /* current lookahead token */

static void advance(void)
{
    while (*pos == ' ' || *pos == '\t')
        pos++;
    tok.col = (int)(pos - src) + 1;
    if (*pos == '\0' || *pos == '\n') {
        tok.kind = T_END;
    } else if (isdigit((unsigned char)*pos) || *pos == '.') {
        char *end;
        tok.kind = T_NUM;
        tok.num = strtod(pos, &end);
        pos = end;
    } else {
        /* TODO: identifiers */
        tok.kind = T_OP;
        tok.text[0] = *pos++;
        tok.text[1] = '\0';
    }
}

static double expr(void);

static double primary(void)
{
    if (tok.kind == T_NUM) {
        double v = tok.num;
        advance();
        return v;
    }
    if (tok.kind == T_OP && tok.text[0] == '(') {
        advance();
        double v = expr();
        /* TODO: require ')' */
        advance();
        return v;
    }
    fprintf(stderr, "error: unexpected input at column %d\n", tok.col);
    exit(1);    /* TODO: milestone 4: recover instead of exiting */
}

static double term(void)
{
    double v = primary();
    while (tok.kind == T_OP && (tok.text[0] == '*' || tok.text[0] == '/')) {
        char op = tok.text[0];
        advance();
        double rhs = primary();
        v = (op == '*') ? v * rhs : v / rhs;
    }
    return v;
}

static double expr(void)
{
    double v = term();
    while (tok.kind == T_OP && (tok.text[0] == '+' || tok.text[0] == '-')) {
        char op = tok.text[0];
        advance();
        double rhs = term();
        v = (op == '+') ? v + rhs : v - rhs;
    }
    return v;
}

int main(void)
{
    char line[256];
    while (printf("> "), fflush(stdout), fgets(line, sizeof line, stdin) != NULL) {
        src = pos = line;
        advance();
        if (tok.kind == T_END)
            continue;
        double v = expr();
        printf("%.12g\n", v);
    }
    return 0;
}
```

## Testing

Put expressions and expected results in a file and check them all:

```text
1 + 2 * 3          7
(1 + 2) * 3        9
2 ^ 3 ^ 2          512
-2 ^ 2             -4
10 % 4             2
8 / 2 / 2          2
max(2, 3) * 2      6
```

A short shell loop can feed each expression to `calc` and compare with the second column. Also test errors: `1 +`, `(1`, `foo(1)`, `1 2`.

## Stretch goals

- Comparison and logical operators (`<`, `==`, `&&`) with correct precedence.
- User-defined functions: `f(x) = x^2 + 1`, stored as the token text and re-parsed on call.
- Compile to bytecode: instead of evaluating while parsing, emit instructions for a little stack machine, then run them. Measure the speedup when evaluating the same expression a million times.
- Arbitrary-precision integers using arrays of digits.
