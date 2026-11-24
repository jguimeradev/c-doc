---
name: "LONG_MIN"
kind: macro
header: limits
summary: "Minimum value of long."
signature: "#define LONG_MIN /* magnitude at least -2147483647 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Minimum value of long. The standard requires a magnitude of at least `-2147483647`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("LONG_MIN = %lld\n", (long long)LONG_MIN);
}
```
