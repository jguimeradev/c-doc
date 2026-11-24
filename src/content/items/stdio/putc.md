---
name: "putc"
kind: fn
header: stdio
summary: "Like fputc, but may be a macro."
signature: "int putc(int c, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Simple-Output.html
---

Equivalent to [`fputc`](../fn.fputc/), but may evaluate `stream` more than once.
