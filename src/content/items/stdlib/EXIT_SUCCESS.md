---
name: EXIT_SUCCESS
kind: macro
header: stdlib
summary: Portable exit status value meaning success.
signature: "#define EXIT_SUCCESS /* implementation-defined, 0 on POSIX */"
source: https://sourceware.org/glibc/manual/latest/html_node/Exit-Status.html
---

The conventional status value for successful termination, for use with `exit` or as the return value of `main`.

**Portability note:** some non-POSIX systems use different exit status conventions. Use `EXIT_SUCCESS` and [`EXIT_FAILURE`](../macro.EXIT_FAILURE/) for portability.

```c
int main(void)
{
    puts("done");
    return EXIT_SUCCESS;
}
```
