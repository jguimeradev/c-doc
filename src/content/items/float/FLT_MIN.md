---
name: "FLT_MIN"
kind: macro
header: float
summary: "Minimum normalized positive float."
signature: "#define FLT_MIN /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Floating-Point-Parameters.html
---

Minimum normalized positive float. The standard requires at least `1E-37` in magnitude (for `EPSILON` and `MIN`, at most). On IEEE 754 systems, `float` has 24 mantissa bits (about 7 decimal digits) and `double` 53 (about 15–16).
