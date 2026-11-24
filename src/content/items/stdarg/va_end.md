---
name: "va_end"
kind: macro
header: stdarg
summary: "Cleans up after processing a variable argument list."
signature: "void va_end(va_list ap);"
source: https://sourceware.org/glibc/manual/latest/html_node/Argument-Macros.html
---

Must be called once after the arguments have been processed and before the function returns.
