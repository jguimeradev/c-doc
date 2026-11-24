---
name: "isxdigit"
kind: fn
header: ctype
summary: "Tests whether c is a hexadecimal digit."
signature: "int isxdigit(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a hexadecimal digit — '0'–'9', 'a'–'f', 'A'–'F' — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `isxdigit((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (isxdigit((unsigned char)*p))
        count++;
```
