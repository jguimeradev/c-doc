---
name: "memmove"
kind: fn
header: string
summary: "Copies n bytes, working correctly even if the regions overlap."
signature: "void *memmove(void *s, const void *ct, size_t n);"
source: https://sourceware.org/glibc/manual/latest/html_node/Copying-Strings-and-Arrays.html
---

Same as [`memcpy`](../fn.memcpy/) except that it works when the objects overlap. Returns `s`.

```c
/* delete element i from an array of len ints */
memmove(&a[i], &a[i + 1], (len - i - 1) * sizeof a[0]);
```
