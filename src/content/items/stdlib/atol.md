---
name: "atol"
kind: fn
header: stdlib
summary: "Converts the initial part of a string to long."
signature: "long atol(const char *s);"
source: https://sourceware.org/glibc/manual/latest/html_node/Parsing-of-Integers.html
---

Equivalent to `strtol(s, NULL, 10)` without error reporting. See [`strtol`](../fn.strtol/).
