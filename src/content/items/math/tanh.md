---
name: "tanh"
kind: fn
header: math
summary: "Hyperbolic tangent of x."
signature: "double tanh(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Hyperbolic-Functions.html
---

Hyperbolic tangent of x.



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", tanh(2.0));
}
```
