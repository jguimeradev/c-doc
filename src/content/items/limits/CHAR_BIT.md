---
name: "CHAR_BIT"
kind: macro
header: limits
summary: "Number of bits in a char (a byte)."
signature: "#define CHAR_BIT /* magnitude at least 8 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Range-of-Type.html
---

Number of bits in a char (a byte). The standard requires a magnitude of at least `8`; implementations may use larger values (C23 also requires two's-complement ranges, so minimums such as `INT_MIN` are one further from zero than shown).

```c
#include <limits.h>
#include <stdio.h>

int main(void)
{
    printf("CHAR_BIT = %lld\n", (long long)CHAR_BIT);
}
```
