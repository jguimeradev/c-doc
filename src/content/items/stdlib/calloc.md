---
name: calloc
kind: fn
header: stdlib
summary: Allocates a zero-initialized array of count elements of eltsize bytes each.
signature: "void *calloc(size_t count, size_t eltsize);"
safety: "MT-Safe | AS-Unsafe lock | AC-Unsafe lock fd mem"
source: https://sourceware.org/glibc/manual/latest/html_node/Allocating-Cleared-Space.html
---

Allocates memory for an array of `count` elements, each `eltsize` bytes, and clears every byte to zero before returning.

It behaves like `reallocarray(NULL, count, eltsize)`, except the contents are zeroed.

## Return value

A pointer to the zeroed memory, or a null pointer if the allocation fails.

## Notes

It is not guaranteed that `calloc` calls `reallocarray` and `memset` internally. Conceptually, it is equivalent to:

```c
void *
calloc(size_t count, size_t eltsize)
{
    void *p = reallocarray(0, count, eltsize);
    if (p != NULL)
        memset(p, 0, count * eltsize);
    return p;
}
```
