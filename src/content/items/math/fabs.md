---
name: "fabs"
kind: fn
header: math
summary: "Absolute value |x|."
signature: "double fabs(double x);"
source: https://sourceware.org/glibc/manual/latest/html_node/Absolute-Value.html
---

Absolute value |x|.



```c
#include <math.h>
#include <stdio.h>

/* cc prog.c -lm */
int main(void)
{
    printf("%g\n", fabs(2.0));
}
```
