---
name: "ispunct"
kind: fn
header: ctype
summary: "Tests whether c is a printing character except space, letter or digit."
signature: "int ispunct(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Classification-of-Characters.html
---

Returns nonzero (true) if `c` is a printing character except space, letter or digit — e.g. `! " # , . ; ?` — and `0` otherwise.

<div class="warning">

`c` must be `EOF` or a value representable as `unsigned char`. If `char` is signed on your platform, cast first: `ispunct((unsigned char)ch)`.

</div>

## Examples

```c
size_t count = 0;
for (const char *p = s; *p; p++)
    if (ispunct((unsigned char)*p))
        count++;
```
