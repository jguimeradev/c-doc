---
name: "fgetpos"
kind: fn
header: stdio
summary: "Records the current position in an fpos_t."
signature: "int fgetpos(FILE *stream, fpos_t *ptr);"
source: https://sourceware.org/glibc/manual/latest/html_node/Portable-Positioning.html
---

Stores the position of `stream` in `*ptr`, for later use by [`fsetpos`](../fn.fsetpos/). Returns `0` on success.
