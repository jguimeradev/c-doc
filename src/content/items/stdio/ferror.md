---
name: "ferror"
kind: fn
header: stdio
summary: "Tests the error indicator of a stream."
signature: "int ferror(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/EOF-and-Errors.html
---

Returns nonzero if a read or write error has occurred on `stream`. See [`feof`](../fn.feof/).
