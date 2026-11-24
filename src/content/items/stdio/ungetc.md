---
name: "ungetc"
kind: fn
header: stdio
summary: "Pushes a character back onto an input stream."
signature: "int ungetc(int c, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Unreading.html
---

Pushes `c` back so the next read returns it. Only one character of pushback is guaranteed. Returns `c`, or [`EOF`](../macro.EOF/) on error.

Handy when you've read one character too far, as when scanning a number:

```c
int c;
long n = 0;
while (isdigit(c = getchar()))
    n = 10 * n + (c - '0');
if (c != EOF)
    ungetc(c, stdin);   /* leave the non-digit for the next reader */
```
