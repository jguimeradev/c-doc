---
name: "acos"
kind: fn
header: math
summary: "Arc cosine of x, in [0, \u03c0]."
signature: "double acos(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Inverse-Trig-Functions.html
---

Arc cosine of x, in [0, π].

Domain error if `x` is outside [-1, 1].

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", acos(2.0));
}
```
