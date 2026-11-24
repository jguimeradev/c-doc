---
name: "atan"
kind: fn
header: math
summary: "Arc tangent of x, in [-\u03c0/2, \u03c0/2]."
signature: "double atan(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Inverse-Trig-Functions.html
---

Arc tangent of x, in [-π/2, π/2].



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", atan(2.0));
}
```
