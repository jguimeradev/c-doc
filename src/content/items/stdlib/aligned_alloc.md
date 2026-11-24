---
name: aligned_alloc
kind: fn
header: stdlib
summary: Allocates a block of memory with the requested alignment.
signature: "void *aligned_alloc(size_t alignment, size_t size);"
standard: ISO C11
source: https://sourceware.org/glibc/manual/latest/html_node/Aligned-Memory-Blocks.html
---

Allocates `size` bytes whose address is a multiple of `alignment`. The alignment must be a power of two.

## Return value

A pointer to the aligned memory, or a null pointer on failure.

## Notes

Release the block with [`free`](../fn.free/). Resizing it with [`realloc`](../fn.realloc/) does **not** preserve the special alignment.

```c
float *v = aligned_alloc(64, 1024 * sizeof *v);
```
