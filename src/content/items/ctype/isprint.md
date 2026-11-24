---
name: "isprint"
kind: fn
header: ctype
summary: "Tests whether c is a printing character including space."
signature: "int isprint(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a printing character including space — in ASCII, 32–126 — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `isprint((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (isprint((unsigned char)*p))
        count++;
```
