---
name: "puts"
kind: fn
header: stdio
summary: "Writes a string and a newline to stdout."
signature: "int puts(const char *s);"
source: https://sourceware.org/glibc/manual/latest/html_node/Simple-Output.html
---

Writes `s` followed by `'\n'` to `stdout`. Returns non-negative on success, [`EOF`](../macro.EOF/) on error.
