---
name: "isspace"
kind: fn
header: ctype
summary: "Tests whether c is a white space."
signature: "int isspace(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a white space — space, `\f`, `\n`, `\r`, `\t`, `\v` — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `isspace((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (isspace((unsigned char)*p))
        count++;
```
