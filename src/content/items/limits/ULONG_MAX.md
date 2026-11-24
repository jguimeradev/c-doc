---
name: "ULONG_MAX"
kind: macro
header: limits
summary: "Maximum value of unsigned long."
signature: "#define ULONG_MAX /* magnitude at least 4294967295 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of unsigned long. The standard requires a magnitude of at least `4294967295`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("ULONG_MAX = %lld\n", (long long)ULONG_MAX);
}
```
