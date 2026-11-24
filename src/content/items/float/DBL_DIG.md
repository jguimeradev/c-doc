---
name: "DBL_DIG"
kind: macro
header: float
summary: "Decimal digits of precision for double."
signature: "#define DBL_DIG /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Decimal digits of precision for double. The standard requires at least `10` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
