---
name: "isgraph"
kind: fn
header: ctype
summary: "Tests whether c is a printing character except space."
signature: "int isgraph(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a printing character except space — in ASCII, 33–126 — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `isgraph((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (isgraph((unsigned char)*p))
        count++;
```
