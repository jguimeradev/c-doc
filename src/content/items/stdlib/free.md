---
name: free
kind: fn
header: stdlib
summary: Deallocates memory previously returned by malloc, calloc, or realloc.
signature: "void free(void *ptr);"
source: https://sourceware.org/glibc/manual/latest/html_node/Freeing-after-Malloc.html
---

Deallocates the block of memory pointed to by `ptr`, which must have been obtained from [`malloc`](../fn.malloc/), [`calloc`](../fn.calloc/), [`realloc`](../fn.realloc/) or [`aligned_alloc`](../fn.aligned_alloc/).

Passing a null pointer is a no-op.

<div class="warning">

Using the block after it is freed, or freeing it twice, is **undefined behavior**.

</div>

## Examples

```c
char *s = malloc(64);
/* ... use s ... */
free(s);
s = NULL;   /* guard against accidental reuse */
```
