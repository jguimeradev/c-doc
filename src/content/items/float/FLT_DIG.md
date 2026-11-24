---
name: "FLT_DIG"
kind: macro
header: float
summary: "Decimal digits of precision for float."
signature: "#define FLT_DIG /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Decimal digits of precision for float. The standard requires at least `6` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
