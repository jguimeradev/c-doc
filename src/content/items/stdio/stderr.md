---
name: "stderr"
kind: macro
header: stdio
summary: "The standard error stream, for diagnostics."
signature: "extern FILE *stderr;"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Streams.html
---

A separate output stream for error messages, so they still reach the user when `stdout` is redirected to a file or pipe. It is **not** fully buffered, so messages appear promptly.

```c
fprintf(stderr, "%s: can't open %s\n", progname, path);
```
