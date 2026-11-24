---
name: "FLT_RADIX"
kind: macro
header: float
summary: "Radix of the exponent representation."
signature: "#define FLT_RADIX /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Radix of the exponent representation. The standard requires at least `2` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
