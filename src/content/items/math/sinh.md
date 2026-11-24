---
name: "sinh"
kind: fn
header: math
summary: "Hyperbolic sine of x."
signature: "double sinh(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Hyperbolic-Functions.html
---

Hyperbolic sine of x.



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", sinh(2.0));
}
```
