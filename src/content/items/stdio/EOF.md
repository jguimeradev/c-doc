---
name: "EOF"
kind: macro
header: stdio
summary: "Negative integer returned by input functions at end of file or on error."
signature: "#define EOF (-1) /* a negative int */"
source: https://sourceware.org/glibc/manual/latest/html_node/EOF-and-Errors.html
---

`EOF` is a negative integer constant expression (usually `-1`). Character input functions such as [`getchar`](../fn.getchar/) return it when there is no more input or an error occurred.

Because `EOF` must be distinguishable from every valid character, functions like `getchar` return `int`, not `char`. **Store their result in an `int`.**

```c
int c;   /* not char! */
while ((c = getchar()) != EOF)
    putchar(c);
```

Use [`feof`](../fn.feof/) and [`ferror`](../fn.ferror/) to tell end of file from an error.
