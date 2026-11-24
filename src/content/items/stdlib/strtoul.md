---
name: "strtoul"
kind: fn
header: stdlib
summary: "Converts a string to unsigned long."
signature: "unsigned long strtoul(const char *s, char **endp, int base);"
source: https://sourceware.org/glibc/manual/latest/html_node/Parsing-of-Integers.html
---

Same as [`strtol`](../fn.strtol/) except the result is `unsigned long` and the overflow value is `ULONG_MAX`. Note that a leading `-` is accepted and the result negated in unsigned arithmetic.
