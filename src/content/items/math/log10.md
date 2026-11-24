---
name: "log10"
kind: fn
header: math
summary: "Base-10 logarithm of x, x > 0."
signature: "double log10(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Exponents-and-Logarithms.html
---

Base-10 logarithm of x, x > 0.

Domain error if `x < 0`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", log10(2.0));
}
```
