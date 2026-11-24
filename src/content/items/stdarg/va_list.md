---
name: "va_list"
kind: type
header: stdarg
summary: "Type of an object that walks through a variable argument list."
signature: "typedef /* implementation-defined */ va_list;"
source: https://sourceware.org/glibc/manual/latest/html_node/Argument-Macros.html
---

Declare one in each variadic function, initialize it with [`va_start`](../macro.va_start/), read arguments with [`va_arg`](../macro.va_arg/), and finish with [`va_end`](../macro.va_end/).
