---
name: "getc"
kind: fn
header: stdio
summary: "Like fgetc, but may be a macro."
signature: "int getc(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Character-Input.html
---

Equivalent to [`fgetc`](../fn.fgetc/), except it may be implemented as a macro that evaluates `stream` more than once. Don't pass it an argument with side effects.
