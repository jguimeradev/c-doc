---
name: "LLONG_MIN"
kind: macro
header: limits
summary: "Minimum value of long long (C99)."
signature: "#define LLONG_MIN /* magnitude at least -9223372036854775807 */"
standard: "ISO C99"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Minimum value of long long (C99). The standard requires a magnitude of at least `-9223372036854775807`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("LLONG_MIN = %lld\n", (long long)LLONG_MIN);
}
```
