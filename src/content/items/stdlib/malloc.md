---
name: malloc
kind: fn
header: stdlib
summary: Allocates an uninitialized block of memory of the given size.
signature: "void *malloc(size_t size);"
safety: "MT-Safe | AS-Unsafe lock | AC-Unsafe lock fd mem"
source: https://sourceware.org/glibc/manual/latest/html_node/Basic-Allocation.html
---

Allocates a block of `size` bytes and returns a pointer to it.

The contents of the block are **undefined**: you must initialize it yourself, or use [`calloc`](../fn.calloc/) instead.

## Return value

A pointer to the newly allocated block on success. On failure, returns a null pointer and sets `errno`.

## Examples

You can store the result in any pointer variable without a cast, because ISO C converts `void *` to other pointer types automatically:

```c
struct foo *ptr = malloc(sizeof *ptr);
if (ptr == 0) abort();
memset(ptr, 0, sizeof(struct foo));
```

When allocating space for a string, the size must be **one plus the length** of the string, to leave room for the terminating null byte:

```c
char *ptr = malloc(length + 1);
```

## See also

[`calloc`](../fn.calloc/), [`realloc`](../fn.realloc/), [`free`](../fn.free/)
