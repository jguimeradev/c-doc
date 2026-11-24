---
name: "strncmp"
kind: fn
header: string
summary: "Compares at most n characters of two strings."
signature: "int strncmp(const char *cs, const char *ct, size_t n);"
source: https://sourceware.org/glibc/manual/latest/html_node/String_002fArray-Comparison.html
---

Like [`strcmp`](../fn.strcmp/) but stops after `n` characters.

```c
if (strncmp(line, "#include", 8) == 0)
    handle_include(line);
```
