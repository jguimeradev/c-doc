---
name: "log"
kind: fn
header: math
summary: "Natural logarithm ln(x), x > 0."
signature: "double log(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Exponents-and-Logarithms.html
---

Natural logarithm ln(x), x > 0.

Domain error if `x < 0`; pole error if `x == 0`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", log(2.0));
}
```
