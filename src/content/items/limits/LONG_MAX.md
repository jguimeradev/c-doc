---
name: "LONG_MAX"
kind: macro
header: limits
summary: "Maximum value of long."
signature: "#define LONG_MAX /* magnitude at least +2147483647 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of long. The standard requires a magnitude of at least `+2147483647`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("LONG_MAX = %lld\n", (long long)LONG_MAX);
}
```
