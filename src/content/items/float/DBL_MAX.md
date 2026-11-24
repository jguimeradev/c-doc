---
name: "DBL_MAX"
kind: macro
header: float
summary: "Maximum finite double."
signature: "#define DBL_MAX /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Maximum finite double. The standard requires at least `1E+37` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
