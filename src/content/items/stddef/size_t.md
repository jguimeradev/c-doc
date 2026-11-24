---
name: "size_t"
kind: type
header: stddef
summary: "Unsigned integer type of the result of sizeof."
signature: "typedef /* unsigned integer type */ size_t;"
source: https://sourceware.org/glibc/manual/latest/html_node/Important-Data-Types.html
---

Used for object sizes and array indices throughout the library (`strlen`, `malloc`, `fread`). Print with `%zu` (C99).
