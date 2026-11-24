---
name: "atof"
kind: fn
header: stdlib
summary: "Converts the initial part of a string to double."
signature: "double atof(const char *s);"
source: https://sourceware.org/glibc/manual/latest/html_node/Parsing-of-Floats.html
---

Equivalent to `strtod(s, NULL)`. There is no way to detect errors; use [`strtod`](../fn.strtod/) when the input might be malformed.
