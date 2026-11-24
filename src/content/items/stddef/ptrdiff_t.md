---
name: "ptrdiff_t"
kind: type
header: stddef
summary: "Signed integer type of the difference of two pointers."
signature: "typedef /* signed integer type */ ptrdiff_t;"
source: https://sourceware.org/glibc/manual/latest/html_node/Important-Data-Types.html
---

Subtracting two pointers into the same array yields a `ptrdiff_t` counting elements between them. Print with `%td`.

```c
const char *end = strchr(s, '\0');
ptrdiff_t len = end - s;
```
