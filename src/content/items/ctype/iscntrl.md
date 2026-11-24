---
name: "iscntrl"
kind: fn
header: ctype
summary: "Tests whether c is a control character."
signature: "int iscntrl(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a control character — in ASCII, 0–31 and 127 (DEL) — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `iscntrl((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (iscntrl((unsigned char)*p))
        count++;
```
