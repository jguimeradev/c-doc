---
chapter: input-output
summary: Filters, hex dumps, a mini printf, file comparison and CSV.
---

## Exercise 7-1 · Caesar cipher <span class="diff easy">easy</span>

Generalize `rot13` from [section 7.1](/book/input-output/#71-standard-input-and-output) into `caesar [SHIFT]`, which rotates letters by `SHIFT` places (default 13). Negative shifts must work, so `caesar 3 | caesar -3` gives back the original text.

<details class="hint"><summary>Hint</summary>

Normalize the shift into 0–25 with `((shift % 26) + 26) % 26`, because `%` of a negative number is negative in C.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[])
{
    int shift = argc > 1 ? atoi(argv[1]) : 13;
    shift = ((shift % 26) + 26) % 26;

    int c;
    while ((c = getchar()) != EOF) {
        if (islower(c))
            c = 'a' + (c - 'a' + shift) % 26;
        else if (isupper(c))
            c = 'A' + (c - 'A' + shift) % 26;
        putchar(c);
    }
    return 0;
}
```

</details>

## Exercise 7-2 · hexdump <span class="diff medium">medium</span>

Write `hexdump [FILE]` that prints a file's bytes 16 per line: an 8-digit hexadecimal offset, the bytes in hex, and the printable characters (with `.` for the rest):

```text
00000000  48 65 6c 6c 6f 2c 20 77  6f 72 6c 64 21 0a        |Hello, world!.|
```

<details class="hint"><summary>Hint</summary>

Open the file in binary mode (`"rb"`) and read 16 bytes at a time with [`fread`](/stdio/fn.fread/). The last line may be short; pad the hex column with spaces so the text column lines up.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <ctype.h>
#include <stdio.h>

int main(int argc, char *argv[])
{
    FILE *fp = stdin;
    if (argc > 1 && (fp = fopen(argv[1], "rb")) == NULL) {
        perror(argv[1]);
        return 1;
    }

    unsigned char buf[16];
    unsigned long offset = 0;
    size_t n;

    while ((n = fread(buf, 1, sizeof buf, fp)) > 0) {
        printf("%08lx  ", offset);
        for (size_t i = 0; i < 16; i++) {
            if (i < n)
                printf("%02x ", buf[i]);
            else
                fputs("   ", stdout);
            if (i == 7)
                putchar(' ');
        }
        fputs(" |", stdout);
        for (size_t i = 0; i < n; i++)
            putchar(isprint(buf[i]) ? buf[i] : '.');
        puts("|");
        offset += n;
    }
    if (ferror(fp)) {
        perror("read");
        return 1;
    }
    return 0;
}
```

Using `unsigned char` for the buffer matters: with plain (possibly signed) `char`, bytes ≥ 0x80 would print as `ffffff80` and break `isprint`.

</details>

## Exercise 7-3 · A tiny printf <span class="diff hard">hard</span>

Write `int tiny_printf(const char *fmt, ...)` that supports `%d`, `%u`, `%x`, `%c`, `%s` and `%%`, plus an optional minimum field width (`%5d`, `%-8s`). Output characters only with `putchar`, and return the number written.

<details class="hint"><summary>Hint</summary>

Convert each value into a small local buffer first (digits come out in reverse, so fill the buffer from the end). Then you know its length and can print padding before it (right-aligned) or after it (with `-`).

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

static int emit(const char *s, size_t len, int width, bool left)
{
    int pad = width > (int)len ? width - (int)len : 0, n = 0;
    if (!left)
        for (; pad > 0; pad--, n++) putchar(' ');
    for (size_t i = 0; i < len; i++, n++) putchar(s[i]);
    for (; pad > 0; pad--, n++) putchar(' ');
    return n;
}

/* utoa_rev: write u in base into the end of buf; return pointer to first digit */
static char *utoa_rev(unsigned long u, unsigned base, char *end)
{
    *end = '\0';
    do {
        *--end = "0123456789abcdef"[u % base];
        u /= base;
    } while (u > 0);
    return end;
}

int tiny_printf(const char *fmt, ...)
{
    va_list ap;
    int total = 0;
    char buf[32];

    va_start(ap, fmt);
    for (; *fmt; fmt++) {
        if (*fmt != '%') {
            putchar(*fmt);
            total++;
            continue;
        }
        fmt++;
        bool left = false;
        if (*fmt == '-') {
            left = true;
            fmt++;
        }
        int width = 0;
        while (*fmt >= '0' && *fmt <= '9')
            width = width * 10 + (*fmt++ - '0');

        char *s;
        switch (*fmt) {
        case 'd': {
            int v = va_arg(ap, int);
            unsigned long mag = v < 0 ? -(unsigned long)v : (unsigned long)v;
            s = utoa_rev(mag, 10, buf + sizeof buf - 1);
            if (v < 0)
                *--s = '-';
            total += emit(s, strlen(s), width, left);
            break;
        }
        case 'u':
        case 'x':
            s = utoa_rev(va_arg(ap, unsigned), *fmt == 'u' ? 10 : 16, buf + sizeof buf - 1);
            total += emit(s, strlen(s), width, left);
            break;
        case 'c':
            buf[0] = (char)va_arg(ap, int);     /* char arrives promoted to int */
            total += emit(buf, 1, width, left);
            break;
        case 's':
            s = va_arg(ap, char *);
            total += emit(s, strlen(s), width, left);
            break;
        case '%':
            putchar('%');
            total++;
            break;
        case '\0':
            fmt--;                              /* lone % at the end */
            break;
        default:                                /* unknown: print it verbatim */
            putchar('%');
            putchar(*fmt);
            total += 2;
        }
    }
    va_end(ap);
    return total;
}

int main(void)
{
    tiny_printf("[%5d] [%-5d] [%x] [%c] [%-6s] [%3s] 100%%\n", -42, 7, 255u, 'z', "hi", "long");
    return 0;
}
```

Output: `[  -42] [7    ] [ff] [z] [hi    ] [long] 100%`. Negating through `unsigned long` handles `INT_MIN` correctly, which `-v` would not.

</details>

## Exercise 7-4 · Comparing files <span class="diff medium">medium</span>

Write `cmp FILE1 FILE2`, which reports the first byte where two files differ as `line L, column C`, or reports that one file is a prefix of the other. Exit with 0 if they are identical, 1 if they differ, 2 on error, as the real `cmp` does.

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

int main(int argc, char *argv[])
{
    if (argc != 3) {
        fprintf(stderr, "usage: %s FILE1 FILE2\n", argv[0]);
        return 2;
    }
    FILE *a = fopen(argv[1], "rb"), *b = fopen(argv[2], "rb");
    if (a == NULL || b == NULL) {
        perror(a == NULL ? argv[1] : argv[2]);
        return 2;
    }

    long line = 1, col = 1;
    int ca, cb;
    for (;;) {
        ca = getc(a);
        cb = getc(b);
        if (ca != cb || ca == EOF)
            break;
        if (ca == '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }
    }

    if (ca == cb) {                 /* both EOF */
        return 0;
    } else if (ca == EOF || cb == EOF) {
        printf("EOF on %s after line %ld, column %ld\n",
               ca == EOF ? argv[1] : argv[2], line, col - 1);
    } else {
        printf("%s %s differ: line %ld, column %ld\n", argv[1], argv[2], line, col);
    }
    return 1;
}
```

</details>

## Exercise 7-5 · CSV fields <span class="diff medium">medium</span>

Write a program that prints the third field of every line of a CSV file. First try it with [`strtok`](/string/fn.strtok/) and find an input where it gives the wrong answer. Then fix it with [`strchr`](/string/fn.strchr/). (You may assume fields contain no quoted commas.)

<details class="hint"><summary>Hint</summary>

`strtok` treats consecutive separators as one, so in `a,,c` it sees only two fields and calls `c` the second. Exercise 5-2's `split` handles empty fields correctly.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>
#include <string.h>

int main(void)
{
    char line[1024];

    while (fgets(line, sizeof line, stdin) != NULL) {
        line[strcspn(line, "\r\n")] = '\0';
        char *field = line;
        int i;
        for (i = 1; i < 3 && field != NULL; i++) {
            field = strchr(field, ',');
            if (field != NULL)
                field++;                    /* step past the comma */
        }
        if (field == NULL) {
            puts("");                       /* fewer than 3 fields */
            continue;
        }
        size_t len = strcspn(field, ",");   /* up to the next comma or end */
        printf("%.*s\n", (int)len, field);
    }
    return 0;
}
```

`%.*s` with a length prints part of a string without modifying it. Real CSV (RFC 4180) also allows quoted fields containing commas and newlines; handling that properly needs a small state machine, which makes a good next step.

</details>

## Exercise 7-6 · Timestamped logs <span class="diff easy">easy</span>

Extend `log_msg` from [section 7.3](/book/input-output/#73-variable-length-argument-lists) so every line starts with the local time as `2026-11-24 14:03:07`, using [`time`](/time/fn.time/), [`localtime`](/time/fn.localtime/) and [`strftime`](/time/fn.strftime/).

<details class="solution"><summary>Solution</summary>

```c
#include <stdarg.h>
#include <stdio.h>
#include <time.h>

enum level { INFO, WARN, ERROR };

void log_msg(enum level lvl, const char *fmt, ...)
{
    static const char *const tag[] = { "info", "warn", "error" };
    char stamp[32];
    time_t now = time(NULL);
    va_list ap;

    strftime(stamp, sizeof stamp, "%Y-%m-%d %H:%M:%S", localtime(&now));
    fprintf(stderr, "%s [%s] ", stamp, tag[lvl]);
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fputc('\n', stderr);
}

int main(void)
{
    log_msg(WARN, "disk %s is %d%% full", "/dev/sda1", 93);
    return 0;
}
```

</details>
