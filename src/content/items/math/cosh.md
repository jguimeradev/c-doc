---
name: "cosh"
kind: fn
header: math
summary: "Hyperbolic cosine of x."
signature: "double cosh(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Hyperbolic-Functions.html
---

Hyperbolic cosine of x.



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", cosh(2.0));
}
```
