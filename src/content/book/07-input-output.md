---
title: Input and Output
number: "7"
order: 7
summary: The standard I/O library — character, formatted, file and line I/O, and error handling.
---

The C language has no input or output statements. Everything a program reads or writes goes through library functions, most of them declared in [`<stdio.h>`](/stdio/). Because the library is standardized, a program that sticks to it behaves the same on any system with a conforming C implementation, from Linux to Windows to a microcontroller with a serial port.

This chapter tours the I/O part of the library. The [library reference](/) on this site documents every function individually, and [Appendix B](/book/standard-library/) maps out the other headers.

## 7.1 Standard Input and Output

The library presents text as a **stream**: a sequence of characters divided into lines, each ending in `'\n'`. If the operating system stores line endings differently (Windows uses `\r\n` in text files), the library translates so your program always sees plain `'\n'`.

Every program starts with three streams already open:

| Stream | Usual connection |
|---|---|
| [`stdin`](/stdio/macro.stdin/) | keyboard |
| [`stdout`](/stdio/macro.stdout/) | terminal |
| [`stderr`](/stdio/macro.stderr/) | terminal, for error messages |

The shell can reconnect them without the program knowing:

```sh
./prog < input.txt          # stdin reads from a file
./prog > output.txt         # stdout writes to a file
./gen | ./prog | sort       # streams connected through pipes
```

Redirections are handled by the shell; they don't show up in `argv`.

[`getchar`](/stdio/fn.getchar/) reads the next character from `stdin`, returning [`EOF`](/stdio/macro.EOF/) when there's no more. [`putchar`](/stdio/fn.putchar/) writes a character to `stdout`. Output from `putchar`, `printf` and the rest goes to the same stream in the order the calls happen.

A **filter** reads `stdin`, transforms it, and writes `stdout`, which makes it composable with pipes. Here's ROT13, which rotates each letter 13 places and is its own inverse:

```c
#include <ctype.h>
#include <stdio.h>

int main(void)
{
    int c;
    while ((c = getchar()) != EOF) {
        if (islower(c))
            c = 'a' + (c - 'a' + 13) % 26;
        else if (isupper(c))
            c = 'A' + (c - 'A' + 13) % 26;
        putchar(c);
    }
    return 0;
}
```

```sh
$ echo "Hello" | ./rot13
Uryyb
$ echo "Hello" | ./rot13 | ./rot13
Hello
```

The [`<ctype.h>`](/ctype/) tests are usually implemented as fast table lookups, and `getchar`/`putchar` are often macros, so character-at-a-time processing is cheaper than it looks.

## 7.2 Formatted Output: printf

[`printf`](/stdio/fn.printf/) converts values into text according to a **format string**:

```c
int printf(const char *format, ...);
```

Ordinary characters in the format are copied to the output. Each `%` starts a **conversion specification** that consumes the next argument and formats it. The full shape is

```text
%[flags][width][.precision][length]conversion
```

- **flags**: `-` left-justify, `+` always show sign, space: space before positive numbers, `0` zero-pad, `#` alternate form;
- **width**: minimum number of characters;
- **precision**: digits after the decimal point for `%f`/`%e`, significant digits for `%g`, maximum characters for `%s`, minimum digits for integers;
- **length**: `h`, `hh`, `l`, `ll`, `z`, `j`, `t` for integer sizes, `L` for `long double`.

The most-used conversions:

| Conversion | Argument | Output |
|---|---|---|
| `%d` / `%i` | `int` | signed decimal |
| `%u` | `unsigned` | unsigned decimal |
| `%x` / `%X` | `unsigned` | hexadecimal |
| `%o` | `unsigned` | octal |
| `%c` | `int` | one character |
| `%s` | `char *` | string |
| `%f` | `double` | fixed-point, 6 decimals by default |
| `%e` / `%E` | `double` | scientific notation |
| `%g` / `%G` | `double` | `%f` or `%e`, whichever is more compact |
| `%p` | `void *` | pointer value |
| `%zu` | `size_t` | size |
| `%%` | — | a literal `%` |

Some examples:

```c
printf("[%5d]\n", 42);          /* [   42] */
printf("[%-5d]\n", 42);         /* [42   ] */
printf("[%05d]\n", 42);         /* [00042] */
printf("[%+.2f]\n", 3.14159);   /* [+3.14] */
printf("[%#x]\n", 255);         /* [0xff] */
printf("[%.3s]\n", "abcdef");   /* [abc] */
printf("[%*d]\n", 6, 7);        /* [     7]  width from an argument */
```

`printf` trusts the format: if the arguments don't match the conversions in number or type, the output is garbage or worse. Compilers check literal formats when `-Wall` is on, so keep warnings enabled. And never pass data as the format itself:

```c
printf(user_text);         /* dangerous: any % in user_text is interpreted */
printf("%s", user_text);   /* correct */
```

To format into memory instead of a stream, use [`snprintf`](/stdio/fn.snprintf/), which never writes past the size you give it and returns the length the full result *would* have:

```c
char path[256];
int n = snprintf(path, sizeof path, "%s/%s.cfg", dir, name);
if (n < 0 || (size_t)n >= sizeof path)
    fputs("path too long\n", stderr);
```

## 7.3 Variable-length Argument Lists

`printf` accepts any number of arguments. You can write such **variadic** functions yourself with the macros in [`<stdarg.h>`](/stdarg/):

| Macro | Role |
|---|---|
| [`va_list`](/stdarg/type.va_list/) | type of the cursor that walks the extra arguments |
| [`va_start(ap, last)`](/stdarg/macro.va_start/) | start the cursor after the last named parameter |
| [`va_arg(ap, type)`](/stdarg/macro.va_arg/) | fetch the next argument as `type` |
| [`va_end(ap)`](/stdarg/macro.va_end/) | finish; required before returning |

A variadic function must have at least one named parameter, and it must figure out from its named parameters how many extra arguments there are and what types they have; C passes no count or type information.

Here's a function that returns the largest of a list of `int`s, given a count:

```c
#include <stdarg.h>

int max_of(int count, ...)
{
    va_list ap;
    va_start(ap, count);
    int best = va_arg(ap, int);
    for (int i = 1; i < count; i++) {
        int v = va_arg(ap, int);
        if (v > best)
            best = v;
    }
    va_end(ap);
    return best;
}

/* max_of(4, 7, 42, -3, 19) == 42 */
```

And a logging helper that adds a severity prefix and passes the rest straight to the library through [`vfprintf`](/stdio/fn.vfprintf/):

```c
#include <stdarg.h>
#include <stdio.h>

enum level { INFO, WARN, ERROR };

void log_msg(enum level lvl, const char *fmt, ...)
{
    static const char *const tag[] = { "info", "warn", "error" };
    va_list ap;

    fprintf(stderr, "[%s] ", tag[lvl]);
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fputc('\n', stderr);
}

/* log_msg(WARN, "disk %s is %d%% full", "/dev/sda1", 93); */
```

Extra arguments undergo the **default promotions**: `char` and `short` arrive as `int`, `float` arrives as `double`. So `va_arg(ap, char)` and `va_arg(ap, float)` are always wrong. Use `int` and `double`.

GCC and Clang can type-check calls to your own printf-like functions if you annotate them with `__attribute__((format(printf, 2, 3)))`.

## 7.4 Formatted Input: scanf

[`scanf`](/stdio/fn.scanf/) is `printf` in reverse: it reads characters, converts them according to a format, and **stores the results through pointers**:

```c
int scanf(const char *format, ...);
```

It returns the number of items successfully converted and stored, or `EOF` if input ended before the first conversion. Checking that number is the only way to know what actually happened.

In the format:

- white space matches any amount of white space (including none) in the input;
- other ordinary characters must match the input exactly;
- `%` conversions read and convert a field. `%d` reads an `int`, `%lf` a `double` (note: `%f` is for `float *`), `%s` a whitespace-delimited word, `%c` one character, `%[...]` a run of characters from a set. A `*` (`%*d`) reads a field without storing it.

A program that reads `name score` pairs and prints the average:

```c
#include <stdio.h>

int main(void)
{
    char name[50];
    int score, n = 0;
    long total = 0;

    while (scanf("%49s %d", name, &score) == 2) {
        total += score;
        n++;
    }
    if (n > 0)
        printf("%d students, average %.1f\n", n, (double)total / n);
    return 0;
}
```

`name` has no `&` because an array already converts to a pointer. The width `49` keeps `%s` from overrunning the 50-byte array; **always give `%s` a width**.

`scanf` stops at the first input it can't match and leaves that input unread, which makes recovering from bad input awkward. A sturdier pattern is to read a whole line with [`fgets`](/stdio/fn.fgets/) and then parse it with [`sscanf`](/stdio/fn.sscanf/), which works on a string. A bad line is then simply skipped:

```c
char line[128];
int h, m, s;

while (fgets(line, sizeof line, stdin) != NULL) {
    if (sscanf(line, "%d:%d:%d", &h, &m, &s) == 3)
        printf("%d seconds\n", h * 3600 + m * 60 + s);
    else if (sscanf(line, "%d:%d", &m, &s) == 2)
        printf("%d seconds\n", m * 60 + s);
    else
        fprintf(stderr, "can't parse: %s", line);
}
```

Calls to `scanf` can be interleaved with other input functions; each picks up where the last left off. And the single most common `scanf` bug: forgetting the `&`. `scanf("%d", count)` passes the *value* of `count` where an address is expected. Compiler warnings catch it.

## 7.5 File Access

To work with a file by name, open it with [`fopen`](/stdio/fn.fopen/), which returns a **file pointer**, a `FILE *`:

```c
FILE *fp = fopen("data.csv", "r");
if (fp == NULL) {
    perror("data.csv");
    return 1;
}
```

[`FILE`](/stdio/type.FILE/) is an opaque structure the library uses to track the file's buffer, position and status. You never look inside; you just pass the pointer to other functions.

The **mode** string says how you'll use the file:

| Mode | Meaning |
|---|---|
| `"r"` | read an existing file |
| `"w"` | write, creating the file or **erasing** an existing one |
| `"a"` | append to the end, creating the file if needed |
| `"r+"`, `"w+"`, `"a+"` | both reading and writing |

Add `b` (`"rb"`, `"wb"`) for binary data, which disables newline translation on systems that do it. C11 adds `x` (`"wx"`) to fail instead of overwriting an existing file.

The stream versions of the character functions take the file pointer as an argument: [`getc(fp)`](/stdio/fn.getc/), [`putc(c, fp)`](/stdio/fn.putc/), [`fprintf(fp, …)`](/stdio/fn.fprintf/), [`fscanf(fp, …)`](/stdio/fn.fscanf/). In fact `getchar()` is just `getc(stdin)`.

When you're done, [`fclose`](/stdio/fn.fclose/) flushes any buffered output and releases the stream. All open streams are closed automatically when the program exits normally, but closing explicitly frees resources early and, importantly, lets you check for write errors.

Here's `nl`, which numbers the lines of each file named on the command line, or of standard input when there are none:

```c
#include <stdio.h>
#include <string.h>

static void number_lines(FILE *in, const char *name, long *lineno)
{
    char buf[4096];
    int at_line_start = 1;

    while (fgets(buf, sizeof buf, in) != NULL) {
        if (at_line_start)
            printf("%6ld  ", ++*lineno);
        fputs(buf, stdout);
        /* a line longer than buf arrives in pieces; only number its first piece */
        at_line_start = (buf[0] != '\0' && buf[strlen(buf) - 1] == '\n');
    }
    if (ferror(in))
        fprintf(stderr, "nl: read error on %s\n", name);
}

int main(int argc, char *argv[])
{
    long lineno = 0;

    if (argc == 1)
        number_lines(stdin, "stdin", &lineno);
    for (int i = 1; i < argc; i++) {
        FILE *fp = fopen(argv[i], "r");
        if (fp == NULL) {
            perror(argv[i]);
            continue;
        }
        number_lines(fp, argv[i], &lineno);
        fclose(fp);
    }
    return 0;
}
```

## 7.6 Error Handling: Stderr and Exit

Error messages should go to **`stderr`**, not `stdout`. If a user runs `./prog > out.txt`, anything printed to `stdout` lands in the file, unseen; messages on `stderr` still reach the terminal and don't corrupt the output data.

Good diagnostics name the program, the object involved, and the reason. The reason comes from [`errno`](/errno/macro.errno/), which failing library calls set, and is turned into text by [`strerror`](/string/fn.strerror/) or [`perror`](/stdio/fn.perror/):

```c
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *progname = "prog";

static void die(const char *what)
{
    fprintf(stderr, "%s: %s: %s\n", progname, what, strerror(errno));
    exit(EXIT_FAILURE);
}

int main(int argc, char *argv[])
{
    if (argc > 0)
        progname = argv[0];
    if (argc != 2) {
        fprintf(stderr, "usage: %s FILE\n", progname);
        return EXIT_FAILURE;
    }
    FILE *fp = fopen(argv[1], "r");
    if (fp == NULL)
        die(argv[1]);          /* e.g. "prog: notes.txt: No such file or directory" */

    /* ... process the file, writing results to stdout ... */

    fclose(fp);
    if (fflush(stdout) == EOF || ferror(stdout))
        die("write error");    /* e.g. disk full, or the reader of a pipe went away */
    return EXIT_SUCCESS;
}
```

[`exit(status)`](/stdlib/fn.exit/) ends the program from anywhere, after running [`atexit`](/stdlib/fn.atexit/) handlers and flushing and closing all streams. The status reaches whoever started the program: zero ([`EXIT_SUCCESS`](/stdlib/macro.EXIT_SUCCESS/)) means success, anything else ([`EXIT_FAILURE`](/stdlib/macro.EXIT_FAILURE/)) failure. Returning from `main` does the same thing.

[`ferror`](/stdio/fn.ferror/) reports whether an error occurred on a stream, and [`feof`](/stdio/fn.feof/) whether end of file was reached. Output errors are rare but real; a program whose output matters should check before claiming success.

## 7.7 Line Input and Output

[`fgets`](/stdio/fn.fgets/) reads a line, up to a size limit:

```c
char *fgets(char *buf, int size, FILE *fp);
```

It stops after a newline (which it keeps) or after `size - 1` characters, always null-terminates, and returns `NULL` at end of file or on error. A line too long for the buffer simply arrives across several calls; you can tell because the buffer doesn't end with `'\n'`.

[`fputs`](/stdio/fn.fputs/) writes a string to a stream without adding anything; [`puts`](/stdio/fn.puts/) writes to `stdout` and appends a newline.

`gets`, which read a line from `stdin` with **no size limit**, was so dangerous it was removed from the language in C11. Never use it.

Combined with the string functions, these make line-oriented processing easy. This program prints only the lines that contain a given word, ignoring case:

```c
#include <ctype.h>
#include <stdio.h>
#include <string.h>

/* contains_ci: case-insensitive substring search */
static int contains_ci(const char *hay, const char *needle)
{
    size_t n = strlen(needle);
    for (; *hay; hay++) {
        size_t i = 0;
        while (i < n && tolower((unsigned char)hay[i]) == tolower((unsigned char)needle[i]))
            i++;
        if (i == n)
            return 1;
    }
    return n == 0;
}

int main(int argc, char *argv[])
{
    char line[2048];

    if (argc != 2) {
        fprintf(stderr, "usage: %s WORD\n", argv[0]);
        return 2;
    }
    while (fgets(line, sizeof line, stdin) != NULL)
        if (contains_ci(line, argv[1]))
            fputs(line, stdout);
    return 0;
}
```

When lines can be arbitrarily long, POSIX's `getline` reads into a buffer that it grows with `realloc` as needed.

## 7.8 Miscellaneous Functions

The rest of the standard library is summarized in [Appendix B](/book/standard-library/). Here are the parts used most often alongside I/O.

### 7.8.1 String operations

[`<string.h>`](/string/) provides copying ([`strcpy`](/string/fn.strcpy/), [`memcpy`](/string/fn.memcpy/), [`memmove`](/string/fn.memmove/)), concatenation ([`strcat`](/string/fn.strcat/)), comparison ([`strcmp`](/string/fn.strcmp/), [`strncmp`](/string/fn.strncmp/), [`memcmp`](/string/fn.memcmp/)), searching ([`strchr`](/string/fn.strchr/), [`strrchr`](/string/fn.strrchr/), [`strstr`](/string/fn.strstr/), [`strpbrk`](/string/fn.strpbrk/)) and tokenizing ([`strtok`](/string/fn.strtok/)).

### 7.8.2 Character class testing and conversion

[`<ctype.h>`](/ctype/) tests characters ([`isdigit`](/ctype/fn.isdigit/), [`isalpha`](/ctype/fn.isalpha/), [`isspace`](/ctype/fn.isspace/), [`ispunct`](/ctype/fn.ispunct/), …) and converts case ([`toupper`](/ctype/fn.toupper/), [`tolower`](/ctype/fn.tolower/)). Their argument must be `EOF` or a value representable as `unsigned char`: when testing a `char` from a string, write `isdigit((unsigned char)c)`.

### 7.8.3 Ungetc

[`ungetc(c, fp)`](/stdio/fn.ungetc/) pushes one character back so the next read returns it again. That's exactly what a tokenizer needs after reading one character past the end of a number or identifier. One character of pushback is guaranteed.

### 7.8.4 Command execution

[`system(cmd)`](/stdlib/fn.system/) hands a command string to the operating system's command interpreter and waits for it to finish. What commands exist is entirely system-dependent, and passing untrusted text to it invites command injection; POSIX `fork`/`exec` or `posix_spawn` give finer control.

### 7.8.5 Storage management

[`malloc(n)`](/stdlib/fn.malloc/) allocates `n` uninitialized bytes; [`calloc(count, size)`](/stdlib/fn.calloc/) allocates a zero-filled array; [`realloc(p, n)`](/stdlib/fn.realloc/) resizes; [`free(p)`](/stdlib/fn.free/) releases. All of them return `NULL` on failure, which you must check. Memory returned by them is suitably aligned for any type.

Rules that prevent most memory bugs:

- free exactly what you allocated, exactly once;
- never use memory after freeing it; set the pointer to `NULL` if it lives on;
- when freeing a linked structure, read the link before freeing the node that contains it:

```c
while (node != NULL) {
    struct item *after = node->next;   /* save it first */
    free(node);
    node = after;
}
```

Tools like Valgrind and `-fsanitize=address` find violations of these rules automatically.

### 7.8.6 Mathematical functions

[`<math.h>`](/math/) declares functions on `double`: [`sqrt`](/math/fn.sqrt/), [`pow`](/math/fn.pow/), [`exp`](/math/fn.exp/), [`log`](/math/fn.log/), [`sin`](/math/fn.sin/), [`cos`](/math/fn.cos/), [`atan2`](/math/fn.atan2/), [`floor`](/math/fn.floor/), [`ceil`](/math/fn.ceil/), [`fabs`](/math/fn.fabs/), [`fmod`](/math/fn.fmod/) and more. On many UNIX systems, link with `-lm`.

### 7.8.7 Random number generation

[`rand()`](/stdlib/fn.rand/) returns pseudo-random integers from 0 to [`RAND_MAX`](/stdlib/macro.RAND_MAX/); [`srand(seed)`](/stdlib/fn.srand/) chooses the sequence. To get a value in `[0, 1)`:

```c
double r = rand() / (RAND_MAX + 1.0);
```

and an integer in `[lo, hi]` (slightly biased, but fine for games and simulations):

```c
int roll = lo + (int)(r * (hi - lo + 1));
```

`rand` is not suitable for cryptography or anything security-sensitive.
