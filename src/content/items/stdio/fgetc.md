---
name: "fgetc"
kind: fn
header: stdio
summary: "Reads the next character from a stream."
signature: "int fgetc(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Character-Input.html
---

Returns the next character of `stream` as an `unsigned char` converted to `int`, or [`EOF`](../macro.EOF/) at end of file or on error.
