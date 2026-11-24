---
name: "assert"
kind: macro
header: assert
summary: "Aborts with a diagnostic if expression is false (unless NDEBUG is defined)."
signature: "void assert(int expression);"
source: https://sourceware.org/glibc/manual/latest/html_node/Consistency-Checking.html
---

If `expression` is zero, `assert` prints a message to `stderr` naming the expression, source file and line number, then calls [`abort`](/stdlib/fn.abort/):

```text
prog: sort.c:42: merge: Assertion `lo <= hi' failed.
```

If [`NDEBUG`](../macro.NDEBUG/) is defined when `<assert.h>` is included, `assert` expands to nothing, **so the expression is not evaluated at all**. Never put side effects inside an assertion.

```c
#include <assert.h>

double average(const double *v, size_t n)
{
    assert(v != NULL && n > 0);
    ...
}
```

Assertions document and check *programmer* assumptions. Don't use them to validate user input or handle runtime failures like a missing file.
