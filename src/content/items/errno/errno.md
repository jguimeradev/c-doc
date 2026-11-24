---
name: "errno"
kind: macro
header: errno
summary: "The error number set by library functions on failure."
signature: "extern int errno;  /* actually a macro: a modifiable int lvalue */"
source: https://sourceware.org/glibc/manual/latest/html_node/Checking-for-Errors.html
---

Many library functions store a positive error code in `errno` when they fail. The library never sets it to zero, and a successful call may change it, so:

1. Check the function's return value first; only consult `errno` if it signals failure.
2. When a function has no distinct failure return (like [`strtol`](/stdlib/fn.strtol/)), set `errno = 0` before calling.

`errno` is thread-local in modern implementations. Turn it into a message with [`strerror`](/string/fn.strerror/) or [`perror`](/stdio/fn.perror/).

```c
errno = 0;
double r = sqrt(x);
if (errno == EDOM)
    fputs("sqrt: negative argument\n", stderr);
```
