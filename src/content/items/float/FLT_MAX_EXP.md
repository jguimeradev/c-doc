---
name: "FLT_MAX_EXP"
kind: macro
header: float
summary: "Maximum n such that FLT_RADIX^(n-1) is representable."
signature: "#define FLT_MAX_EXP /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Maximum n such that FLT_RADIX^(n-1) is representable. On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
