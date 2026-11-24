---
name: "sin"
kind: fn
header: math
summary: "Sine of x (radians)."
signature: "double sin(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Trig-Functions.html
---

Sine of x (radians).



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", sin(2.0));
}
```
