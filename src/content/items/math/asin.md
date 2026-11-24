---
name: "asin"
kind: fn
header: math
summary: "Arc sine of x, in [-\u03c0/2, \u03c0/2]."
signature: "double asin(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Inverse-Trig-Functions.html
---

Arc sine of x, in [-π/2, π/2].

Domain error if `x` is outside [-1, 1].

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", asin(2.0));
}
```
