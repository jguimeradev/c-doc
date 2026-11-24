---
name: "ldexp"
kind: fn
header: math
summary: "Computes x \u00b7 2^n."
signature: "double ldexp(double x, int n);"
source: https://sourceware.org/glibc/manual/latest/html_node/Normalization-Functions.html
---

Computes x · 2^n.



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", ldexp(0.75, 4));
}
```
