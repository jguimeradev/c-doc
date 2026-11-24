---
title: A Tutorial Introduction
number: "1"
order: 1
summary: A quick tour of C through small, complete programs.
---

This chapter is a sprint. Rather than stating every rule up front, it shows a series of short, working programs and explains just enough to understand each one. The precise rules come in later chapters; for now the goal is to get comfortable reading and writing real C.

## 1.1 Getting Started

Tradition says the first program should print a greeting:

```c
#include <stdio.h>

int main(void)
{
    printf("hello, world\n");
    return 0;
}
```

Put it in a file called `hello.c`, then build and run it:

```sh
cc -Wall -o hello hello.c
./hello
```

Line by line:

- `#include <stdio.h>` pulls in the declarations for the standard input/output library, which is where [`printf`](/stdio/fn.printf/) lives. C itself has no built-in printing statement.
- Every C program is built from **functions** (which hold the code) and **variables** (which hold the data). Running a program means calling its function named `main`.
- `int main(void)` declares that `main` takes nothing and hands back an `int`. That integer becomes the program's exit status; `0` tells the shell everything went fine.
- Braces `{ }` wrap the body of the function.
- `"hello, world\n"` is a **string literal**. `\n` is an *escape sequence* meaning "newline"; `printf` only starts a new line when you ask it to.

Other common escapes are `\t` for a tab, `\\` for a backslash, `\"` for a double quote and `\0` for the null character.

## 1.2 Variables and Arithmetic Expressions

Here is a program that prints a conversion table from kilometers to miles:

```c
#include <stdio.h>

/* print kilometers and the equivalent miles for 0, 10, ..., 100 */
int main(void)
{
    int km;
    int first = 0, last = 100, step = 10;
    double miles;

    km = first;
    while (km <= last) {
        miles = km * 0.621371;
        printf("%3d km = %6.2f mi\n", km, miles);
        km = km + step;
    }
    return 0;
}
```

```text
  0 km =   0.00 mi
 10 km =   6.21 mi
 20 km =  12.43 mi
...
```

What to notice:

- Text between `/*` and `*/` is a **comment**, as is anything from `//` to the end of a line (C99 onward).
- Each variable is **declared** with a type before it's used. `int` holds whole numbers and `double` holds floating-point numbers. Other basic types include `char`, `short`, `long`, `long long` and `float`.
- `while` checks its condition, runs the body if the condition holds, then checks again, stopping once the condition is false.
- In the `printf` format, `%3d` prints an integer padded to 3 columns and `%6.2f` a floating-point value padded to 6 columns with 2 decimals.

Watch out for **integer division**: when both operands of `/` are integers, the fractional part is thrown away. `7 / 2` is `3`. Make either operand floating-point (`7.0 / 2`) to get `3.5`.

## 1.3 The for Statement

The same table, written with `for`:

```c
#include <stdio.h>

int main(void)
{
    for (int km = 0; km <= 100; km += 10)
        printf("%3d km = %6.2f mi\n", km, km * 0.621371);
    return 0;
}
```

The parentheses of a `for` hold three things separated by semicolons: a setup step run once, a test checked before every pass, and an update run after every pass. When a loop is driven by a counter, `for` keeps all of that in one visible place; otherwise `while` is often clearer.

Declaring `km` inside the `for` (allowed since C99) means it only exists within the loop.

## 1.4 Symbolic Constants

Numbers like `100` and `0.621371` scattered through code say nothing about what they mean, and they're easy to miss when something changes. Give them names with `#define`:

```c
#include <stdio.h>

#define FIRST_KM   0
#define LAST_KM    100
#define STEP_KM    10
#define MI_PER_KM  0.621371

int main(void)
{
    for (int km = FIRST_KM; km <= LAST_KM; km += STEP_KM)
        printf("%3d km = %6.2f mi\n", km, km * MI_PER_KM);
    return 0;
}
```

Before compiling, the preprocessor swaps each name for its text. A `#define` line has no semicolon. Upper-case names are the convention, so these stand out from variables.

## 1.5 Character Input and Output

The standard library treats text as a **stream** of characters broken into lines by newline characters. The most basic tools work one character at a time: [`getchar`](/stdio/fn.getchar/) reads the next character of input, and [`putchar`](/stdio/fn.putchar/) writes one character.

### 1.5.1 Echoing input

```c
#include <stdio.h>

int main(void)
{
    int ch;

    while ((ch = getchar()) != EOF)
        putchar(ch);
    return 0;
}
```

Two things deserve attention:

- `ch` is declared `int`, not `char`. When input runs out, `getchar` returns the special value [`EOF`](/stdio/macro.EOF/), which must be distinguishable from every possible character, so the variable has to be wider than a `char`.
- An assignment is an expression with a value, so `(ch = getchar()) != EOF` reads a character *and* tests it. The inner parentheses matter: without them, `!=` would be applied first.

To end input at the keyboard, press Ctrl-D (UNIX) or Ctrl-Z then Enter (Windows). Or feed it a file: `./echo < notes.txt`.

### 1.5.2 Counting characters

```c
long total = 0;
while (getchar() != EOF)
    total++;
printf("%ld characters\n", total);
```

`total++` adds one. A `long` is used because an `int` is only guaranteed to reach 32767.

### 1.5.3 Counting blank lines

```c
int ch, prev = '\n';
int blank = 0;

while ((ch = getchar()) != EOF) {
    if (ch == '\n' && prev == '\n')
        blank++;
    prev = ch;
}
printf("%d blank lines\n", blank);
```

`'\n'` in single quotes is a **character constant**: just the integer code of that character (10 in ASCII). It is not a string. `'x'` is one number; `"x"` is an array holding `'x'` followed by `'\0'`.

Comparison uses `==`. Accidentally writing `=` gives an assignment, which compiles fine and does the wrong thing; `-Wall` will warn you.

### 1.5.4 Counting words

Treat a word as any run of characters that aren't spaces, tabs or newlines:

```c
#include <stdio.h>
#include <stdbool.h>

int main(void)
{
    int ch;
    long words = 0;
    bool inside = false;

    while ((ch = getchar()) != EOF) {
        bool space = (ch == ' ' || ch == '\t' || ch == '\n');
        if (space)
            inside = false;
        else if (!inside) {
            inside = true;      /* first character of a new word */
            words++;
        }
    }
    printf("%ld words\n", words);
    return 0;
}
```

`||` is logical OR, `&&` is logical AND, and `!` is NOT. C stops evaluating `||` and `&&` as soon as the answer is settled. `bool`, `true` and `false` come from `<stdbool.h>` (and are built in as of C23).

## 1.6 Arrays

An array holds many values of the same type under one name. This program counts how many times each letter of the alphabet appears in its input, ignoring case, and draws a little bar chart:

```c
#include <ctype.h>
#include <stdio.h>

int main(void)
{
    int counts[26] = {0};
    int ch;

    while ((ch = getchar()) != EOF)
        if (isalpha(ch))
            counts[tolower(ch) - 'a']++;

    for (int i = 0; i < 26; i++) {
        printf("%c %5d ", 'a' + i, counts[i]);
        for (int j = 0; j < counts[i] && j < 60; j++)
            putchar('#');
        putchar('\n');
    }
    return 0;
}
```

`int counts[26]` reserves 26 integers, numbered `counts[0]` through `counts[25]`; indexing always starts at zero. The `{0}` initializer zeroes them all. Without it, a local array starts full of leftover garbage.

`tolower(ch) - 'a'` turns `'a'`…`'z'` into `0`…`25`. ([`isalpha`](/ctype/fn.isalpha/) and [`tolower`](/ctype/fn.tolower/) come from `<ctype.h>`. Subtracting `'a'` relies on the letters being consecutive, which holds for ASCII but not every character set the standard permits; digits `'0'`…`'9'`, on the other hand, are guaranteed consecutive.)

For decisions with more than two outcomes, chain them: `if (…) … else if (…) … else …`. The tests run top to bottom and the first true one wins.

## 1.7 Functions

A function wraps a computation behind a name. Once it works, callers can use it without caring how. Here's a function that computes the greatest common divisor of two numbers using Euclid's algorithm:

```c
#include <stdio.h>

int gcd(int a, int b);   /* prototype: declares gcd before main uses it */

int main(void)
{
    printf("%d\n", gcd(84, 36));    /* 12 */
    printf("%d\n", gcd(17, 5));     /* 1 */
    return 0;
}

/* gcd: greatest common divisor of a and b (both >= 0, not both 0) */
int gcd(int a, int b)
{
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    return a;
}
```

A function definition has the shape:

```text
return-type name(parameters)
{
    declarations and statements
}
```

The line `int gcd(int a, int b);` near the top is a **prototype**. It tells the compiler the function's parameter and return types, so calls can be checked even though the full definition comes later.

`return value;` hands a result back to the caller. Functions that return nothing are declared `void`.

## 1.8 Arguments: Call by Value

When you call a function, each parameter receives a **copy** of the argument's value. That's why `gcd` above can freely overwrite `a` and `b`: it's changing its own copies, and the caller's variables are untouched.

```c
int x = 84, y = 36;
int g = gcd(x, y);
/* x and y are still 84 and 36 */
```

If a function needs to change a variable belonging to its caller, the caller passes that variable's **address**, and the function writes through it. That's how [`scanf`](/stdio/fn.scanf/) fills in your variables. Chapter 5 explains pointers fully.

Arrays behave differently: passing an array really passes the address of its first element, so a function *can* change the caller's array elements.

## 1.9 Character Arrays

Text is stored in arrays of `char`. This program reads lines and prints each one reversed:

```c
#include <stdio.h>
#include <string.h>

#define MAXLEN 256

void reverse_in_place(char s[], int n);

int main(void)
{
    char line[MAXLEN];

    while (fgets(line, sizeof line, stdin) != NULL) {
        int n = (int)strlen(line);
        if (n > 0 && line[n - 1] == '\n')
            line[--n] = '\0';            /* drop the newline */
        reverse_in_place(line, n);
        printf("%s\n", line);
    }
    return 0;
}

/* reverse_in_place: reverse the first n characters of s */
void reverse_in_place(char s[], int n)
{
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        char tmp = s[i];
        s[i] = s[j];
        s[j] = tmp;
    }
}
```

A C **string** is a `char` array whose contents end with the null character `'\0'`. The literal `"abc"` occupies four bytes: `a`, `b`, `c`, `\0`. Functions like [`strlen`](/string/fn.strlen/) and `printf("%s")` find the end of a string by scanning for that `'\0'`.

[`fgets`](/stdio/fn.fgets/) reads one line, including its newline if there's room, and never writes more than the buffer size you give it.

## 1.10 External Variables and Scope

Variables declared inside a function are **local** (also called *automatic*). Each call gets fresh ones, and they vanish when the function returns. They start with unpredictable values unless initialized.

Variables declared **outside** every function are *external* (or *global*). They live for the entire run of the program, start at zero unless initialized, and can be used by any function in the file that comes after them:

```c
#include <stdio.h>

int errors;              /* external: zero at program start */

void check(int ok)
{
    if (!ok)
        errors++;
}

int main(void)
{
    check(1 + 1 == 2);
    check(2 * 2 == 5);
    printf("%d error(s)\n", errors);   /* 1 error(s) */
    return 0;
}
```

A *definition* creates a variable and its storage; a *declaration* just announces its name and type. A global defined in one file is used from another file through a declaration such as `extern int errors;`, typically placed in a header that both files include.

Globals are convenient but make it hard to see which function changed what. Pass values as parameters when you reasonably can, and keep the remaining globals few and clearly named.
