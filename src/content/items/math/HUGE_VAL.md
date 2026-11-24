---
name: "HUGE_VAL"
kind: macro
header: math
summary: "Large positive value returned on overflow."
signature: "#define HUGE_VAL /* positive double, often +infinity */"
source: https://sourceware.org/glibc/manual/latest/html_node/Math-Error-Reporting.html
---

Math functions return `±HUGE_VAL` on overflow and set `errno` to `ERANGE`. On IEEE systems it is positive infinity.
