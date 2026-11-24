---
name: "fputs"
kind: fn
header: stdio
summary: "Writes a string to a stream, without adding a newline."
signature: "int fputs(const char *s, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Simple-Output.html
---

Returns a non-negative value on success, [`EOF`](../macro.EOF/) on error. Unlike [`puts`](../fn.puts/), no newline is appended.
