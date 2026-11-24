---
name: "pow"
kind: fn
header: math
summary: "x raised to the power y."
signature: "double pow(double x, double y);"
source: https://sourceware.org/glibc/manual/latest/html_node/Exponents-and-Logarithms.html
---

x raised to the power y.

Domain error if `x < 0` and `y` is not an integer, or `x == 0` and `y < 0`. Don't use `pow` for small integer powers: `x * x` is faster and exact.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", pow(2.0, 3.0));
}
```
