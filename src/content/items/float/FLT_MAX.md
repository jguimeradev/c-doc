---
name: "FLT_MAX"
kind: macro
header: float
summary: "Maximum finite float."
signature: "#define FLT_MAX /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Maximum finite float. The standard requires at least `1E+37` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
