---
name: "INT_MIN"
kind: macro
header: limits
summary: "Minimum value of int."
signature: "#define INT_MIN /* magnitude at least -32767 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Minimum value of int. The standard requires a magnitude of at least `-32767`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("INT_MIN = %lld\n", (long long)INT_MIN);
}
```
