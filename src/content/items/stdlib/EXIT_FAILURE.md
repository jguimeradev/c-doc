---
name: EXIT_FAILURE
kind: macro
header: stdlib
summary: Portable exit status value meaning failure.
signature: "#define EXIT_FAILURE /* implementation-defined, 1 on POSIX */"
source: https://sourceware.org/glibc/manual/latest/html_node/Exit-Status.html
---

The conventional status value for unsuccessful termination.

```c
FILE *f = fopen(path, "r");
if (f == NULL) {
    perror(path);
    exit(EXIT_FAILURE);
}
```

See also [`EXIT_SUCCESS`](../macro.EXIT_SUCCESS/).
