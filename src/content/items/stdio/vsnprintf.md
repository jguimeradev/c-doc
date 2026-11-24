---
name: "vsnprintf"
kind: fn
header: stdio
summary: "snprintf taking a va_list."
signature: "int vsnprintf(char *s, size_t n, const char *format, va_list arg);"
standard: "ISO C99"
source: https://sourceware.org/glibc/manual/latest/html_node/Variable-Arguments-Output.html
---

The bounded form of [`vsprintf`](../fn.vsprintf/). Returns what [`snprintf`](../fn.snprintf/) would.
