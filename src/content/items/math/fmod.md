---
name: "fmod"
kind: fn
header: math
summary: "Floating-point remainder of x/y, with the sign of x."
signature: "double fmod(double x, double y);"
source: https://sourceware.org/glibc/manual/latest/html_node/Remainder-Functions.html
---

Floating-point remainder of x/y, with the sign of x.

`fmod(7.5, 2.0)` is `1.5`. Domain error (or zero) if `y == 0`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", fmod(2.0, 3.0));
}
```
