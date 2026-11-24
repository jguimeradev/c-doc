---
name: "FLT_ROUNDS"
kind: macro
header: float
summary: "Rounding mode for floating-point addition (1 = to nearest)."
signature: "#define FLT_ROUNDS /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Rounding mode for floating-point addition (1 = to nearest). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
