---
name: "fwrite"
kind: fn
header: stdio
summary: "Writes nobj objects of the given size to a stream."
signature: "size_t fwrite(const void *ptr, size_t size, size_t nobj, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Block-Input_002fOutput.html
---

Returns the number of objects written, which is less than `nobj` only on error.

Binary data written this way is only portable to machines with the same type sizes, byte order and struct padding.
