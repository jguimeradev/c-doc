---
name: "cos"
kind: fn
header: math
summary: "Cosine of x (radians)."
signature: "double cos(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Trig-Functions.html
---

Cosine of x (radians).



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", cos(2.0));
}
```
