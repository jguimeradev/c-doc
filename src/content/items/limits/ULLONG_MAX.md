---
name: "ULLONG_MAX"
kind: macro
header: limits
summary: "Maximum value of unsigned long long (C99)."
signature: "#define ULLONG_MAX /* magnitude at least 18446744073709551615 */"
standard: "ISO C99"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of unsigned long long (C99). The standard requires a magnitude of at least `18446744073709551615`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("ULLONG_MAX = %lld\n", (long long)ULLONG_MAX);
}
```
