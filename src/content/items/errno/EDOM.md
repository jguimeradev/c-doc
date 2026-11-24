---
name: "EDOM"
kind: macro
header: errno
summary: "Domain error: a math function argument outside its domain."
signature: "#define EDOM /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Error-Codes.html
---

Set by functions in [`<math.h>`](/math/) when an argument is outside the domain over which the function is defined, such as `sqrt(-1.0)` or `log(-1.0)`.
