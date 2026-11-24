---
name: "CHAR_MAX"
kind: macro
header: limits
summary: "Maximum value of char."
signature: "#define CHAR_MAX /* magnitude at least UCHAR_MAX or SCHAR_MAX */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of char. The standard requires a magnitude of at least `UCHAR_MAX or SCHAR_MAX`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("CHAR_MAX = %lld\n", (long long)CHAR_MAX);
}
```
