---
name: "fsetpos"
kind: fn
header: stdio
summary: "Restores a position recorded by fgetpos."
signature: "int fsetpos(FILE *stream, const fpos_t *ptr);"
source: https://sourceware.org/glibc/manual/latest/html_node/Portable-Positioning.html
---

Returns `0` on success, nonzero on error.
