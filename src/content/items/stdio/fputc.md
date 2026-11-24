---
name: "fputc"
kind: fn
header: stdio
summary: "Writes a character to a stream."
signature: "int fputc(int c, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Simple-Output.html
---

Writes `c` (converted to `unsigned char`) to `stream`. Returns the character written, or [`EOF`](../macro.EOF/) on error.
