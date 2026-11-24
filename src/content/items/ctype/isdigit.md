---
name: "isdigit"
kind: fn
header: ctype
summary: "Tests whether c is a decimal digit."
signature: "int isdigit(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a decimal digit — '0'–'9' — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `isdigit((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (isdigit((unsigned char)*p))
        count++;
```
