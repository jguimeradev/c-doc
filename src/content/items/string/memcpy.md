---
name: memcpy
kind: fn
header: string
summary: Copies size bytes between non-overlapping memory regions.
signature: "void *memcpy(void *restrict to, const void *restrict from, size_t size);"
source: https://sourceware.org/glibc/manual/latest/html_node/Copying-Strings-and-Arrays.html
---

Copies `size` bytes from the object starting at `from` into the object starting at `to`.

<div class="warning">

The regions must not overlap (that's what `restrict` promises). Use `memmove` when they might.

</div>

## Return value

Returns `to`.

## Examples

```c
struct point a = {1, 2}, b;
memcpy(&b, &a, sizeof b);
```
