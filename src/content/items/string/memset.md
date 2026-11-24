---
name: memset
kind: fn
header: string
summary: Fills a block of memory with a byte value.
signature: "void *memset(void *block, int c, size_t size);"
source: https://sourceware.org/glibc/manual/latest/html_node/Copying-Strings-and-Arrays.html
---

Copies the value of `c` (converted to `unsigned char`) into each of the first `size` bytes of `block`.

## Return value

Returns `block`.

## Examples

```c
char buf[256];
memset(buf, 0, sizeof buf);
```
