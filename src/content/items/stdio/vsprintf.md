---
name: "vsprintf"
kind: fn
header: stdio
summary: "sprintf taking a va_list."
signature: "int vsprintf(char *s, const char *format, va_list arg);"
source: https://sourceware.org/glibc/manual/latest/html_node/Variable-Arguments-Output.html
---

Has the same overflow problem as [`sprintf`](../fn.sprintf/); prefer `vsnprintf` (C99).
