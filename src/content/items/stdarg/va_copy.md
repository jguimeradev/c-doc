---
name: "va_copy"
kind: macro
header: stdarg
summary: "Makes a copy of a va_list at its current position."
signature: "void va_copy(va_list dest, va_list src);"
standard: "ISO C99"
source: https://sourceware.org/glibc/manual/latest/html_node/Argument-Macros.html
---

Needed when you want to traverse the arguments twice, e.g. once to measure with `vsnprintf(NULL, 0, …)` and once to format. Each copy needs its own `va_end`.
