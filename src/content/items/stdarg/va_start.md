---
name: "va_start"
kind: macro
header: stdarg
summary: "Initializes ap to the first unnamed argument."
signature: "void va_start(va_list ap, lastarg);"
safety: "MT-Safe | AS-Safe | AC-Safe"
source: https://sourceware.org/glibc/manual/latest/html_node/Argument-Macros.html
---

`lastarg` must be the last named parameter of the function (the one just before `...`). Must be called before any [`va_arg`](../macro.va_arg/).

## Examples

A function that sums `count` integers:

```c
#include <stdarg.h>

int sum(int count, ...)
{
    va_list ap;
    int total = 0;

    va_start(ap, count);
    for (int i = 0; i < count; i++)
        total += va_arg(ap, int);
    va_end(ap);
    return total;
}

/* sum(3, 5, 5, 6) == 16 */
```
