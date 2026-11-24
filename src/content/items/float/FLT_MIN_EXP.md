---
name: "FLT_MIN_EXP"
kind: macro
header: float
summary: "Minimum n such that 10^n is a normalized number."
signature: "#define FLT_MIN_EXP /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Minimum n such that 10^n is a normalized number. On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
