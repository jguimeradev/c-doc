---
name: "getchar"
kind: fn
header: stdio
summary: "Reads the next character from stdin."
signature: "int getchar(void);"
source: https://sourceware.org/glibc/manual/latest/html_node/Character-Input.html
---

Equivalent to `getc(stdin)`. Returns [`EOF`](../macro.EOF/) at end of file.

```c
/* count lines on standard input */
int c;
long lines = 0;
while ((c = getchar()) != EOF)
    if (c == '\n')
        ++lines;
printf("%ld\n", lines);
```
