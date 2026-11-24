---
name: "UCHAR_MAX"
kind: macro
header: limits
summary: "Maximum value of unsigned char."
signature: "#define UCHAR_MAX /* magnitude at least 255 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Maximum value of unsigned char. The standard requires a magnitude of at least `255`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("UCHAR_MAX = %lld\n", (long long)UCHAR_MAX);
}
```
