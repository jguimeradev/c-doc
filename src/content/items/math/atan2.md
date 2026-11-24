---
name: "atan2"
kind: fn
header: math
summary: "Arc tangent of y/x, in [-\u03c0, \u03c0], using signs to pick the quadrant."
signature: "double atan2(double y, double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Inverse-Trig-Functions.html
---

Arc tangent of y/x, in [-π, π], using signs to pick the quadrant.

Unlike `atan(y / x)`, it handles `x == 0` and returns the correct quadrant — the angle of the point `(x, y)`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", atan2(2.0, 3.0));
}
```
