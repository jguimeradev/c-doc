---
name: "SCHAR_MAX"
kind: macro
header: limits
summary: "Maximum value of signed char."
signature: "#define SCHAR_MAX /* magnitude at least +127 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of signed char. The standard requires a magnitude of at least `+127`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("SCHAR_MAX = %lld\n", (long long)SCHAR_MAX);
}
```
