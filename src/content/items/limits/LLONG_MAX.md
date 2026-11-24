---
name: "LLONG_MAX"
kind: macro
header: limits
summary: "Maximum value of long long (C99)."
signature: "#define LLONG_MAX /* magnitude at least +9223372036854775807 */"
standard: "ISO C99"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of long long (C99). The standard requires a magnitude of at least `+9223372036854775807`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("LLONG_MAX = %lld\n", (long long)LLONG_MAX);
}
```
