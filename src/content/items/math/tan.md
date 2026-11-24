---
name: "tan"
kind: fn
header: math
summary: "Tangent of x (radians)."
signature: "double tan(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Trig-Functions.html
---

Tangent of x (radians).



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", tan(2.0));
}
```
