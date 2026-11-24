---
name: "ceil"
kind: fn
header: math
summary: "Smallest integer not less than x, as a double."
signature: "double ceil(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Rounding-Functions.html
---

Smallest integer not less than x, as a double.

`ceil(2.1)` is `3.0`; `ceil(-2.1)` is `-2.0`.

```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", ceil(2.0));
}
```
