---
name: "CHAR_MIN"
kind: macro
header: limits
summary: "Minimum value of char."
signature: "#define CHAR_MIN /* magnitude at least 0 or SCHAR_MIN */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Minimum value of char. The standard requires a magnitude of at least `0 or SCHAR_MIN`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("CHAR_MIN = %lld\n", (long long)CHAR_MIN);
}
```
