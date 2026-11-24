---
name: "vprintf"
kind: fn
header: stdio
summary: "printf taking a va_list instead of a variable argument list."
signature: "int vprintf(const char *format, va_list arg);"
source: https://sourceware.org/glibc/manual/latest/html_node/Variable-Arguments-Output.html
---

`vprintf`, [`vfprintf`](../fn.vfprintf/) and [`vsprintf`](../fn.vsprintf/) are equivalent to the corresponding `printf` functions, except that the variable argument list is replaced by `arg`, initialized with [`va_start`](/stdarg/macro.va_start/). They let you write your own printf-like functions:

```c
#include <stdarg.h>
#include <stdio.h>

void error(const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    fputs("error: ", stderr);
    vfprintf(stderr, fmt, ap);
    fputc('\n', stderr);
    va_end(ap);
}
```
