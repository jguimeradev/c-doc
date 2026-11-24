---
name: "exp"
kind: fn
header: math
summary: "Exponential function e^x."
signature: "double exp(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Exponents-and-Logarithms.html
---

Exponential function e^x.

Range error on overflow.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", exp(2.0));
}
```
