---
name: "FLT_EPSILON"
kind: macro
header: float
summary: "Smallest x such that 1.0f + x != 1.0f."
signature: "#define FLT_EPSILON /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Smallest x such that 1.0f + x != 1.0f. The standard requires at least `1E-5` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
