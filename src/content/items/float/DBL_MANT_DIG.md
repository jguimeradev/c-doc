---
name: "DBL_MANT_DIG"
kind: macro
header: float
summary: "Number of base-FLT_RADIX digits in the double mantissa."
signature: "#define DBL_MANT_DIG /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Number of base-FLT_RADIX digits in the double mantissa. On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
