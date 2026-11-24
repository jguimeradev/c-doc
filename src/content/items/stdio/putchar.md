---
name: "putchar"
kind: fn
header: stdio
summary: "Writes a character to stdout."
signature: "int putchar(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Simple-Output.html
---

Equivalent to `putc(c, stdout)`.

```c
for (const char *p = "hi\n"; *p; p++)
    putchar(*p);
```
