---
name: "isalpha"
kind: fn
header: ctype
summary: "Tests whether c is a letter."
signature: "int isalpha(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a letter — isupper(c) || islower(c) in the "C" locale — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `isalpha((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (isalpha((unsigned char)*p))
        count++;
```
