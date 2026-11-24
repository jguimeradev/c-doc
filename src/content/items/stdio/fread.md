---
name: "fread"
kind: fn
header: stdio
summary: "Reads up to nobj objects of the given size from a stream."
signature: "size_t fread(void *ptr, size_t size, size_t nobj, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Block-Input_002fOutput.html
---

Reads into `ptr` at most `nobj` objects of `size` bytes each. Returns the number of **objects** read, which may be fewer than requested; use [`feof`](../fn.feof/) and [`ferror`](../fn.ferror/) to find out why.

```c
struct record r;
while (fread(&r, sizeof r, 1, fp) == 1)
    process(&r);
```
