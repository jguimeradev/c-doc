---
name: "floor"
kind: fn
header: math
summary: "Largest integer not greater than x, as a double."
signature: "double floor(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Rounding-Functions.html
---

Largest integer not greater than x, as a double.

`floor(2.9)` is `2.0`; `floor(-2.1)` is `-3.0`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", floor(2.0));
}
```
