---
name: "sqrt"
kind: fn
header: math
summary: "Square root of x, x >= 0."
signature: "double sqrt(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Exponents-and-Logarithms.html
---

Square root of x, x >= 0.

Domain error if `x < 0`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", sqrt(2.0));
}
```
