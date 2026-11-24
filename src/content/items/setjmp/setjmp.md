---
name: "setjmp"
kind: macro
header: setjmp
summary: "Saves the calling environment; returns 0 directly, nonzero via longjmp."
signature: "int setjmp(jmp_buf env);"
safety: "MT-Safe | AS-Safe | AC-Safe"
source: https://sourceware.org/glibc/manual/latest/html_node/Non_002dLocal-Details.html
---

When called normally, saves the execution state in `env` and returns `0`. A later [`longjmp`](../fn.longjmp/) with the same `env` makes `setjmp` return **again**, this time with a nonzero value.

`setjmp` is a macro. It may only appear as the whole controlling expression of `if`, `switch` or a loop, compared against an integer constant there, negated with `!` there, or alone as an expression statement.

## Examples

```c
#include <setjmp.h>
#include <stdio.h>

static jmp_buf on_error;

static void parse(const char *s)
{
    if (*s == '\0')
        longjmp(on_error, 1);   /* bail out from any depth */
    /* ... */
}

int main(void)
{
    if (setjmp(on_error) == 0)
        parse("");
    else
        fputs("parse error\n", stderr);
}
```

<div class="warning">

After the jump, local variables of the function that called `setjmp` that were modified in between have **indeterminate** values unless declared `volatile`.

</div>
