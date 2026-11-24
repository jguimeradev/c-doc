---
name: "div"
kind: fn
header: stdlib
summary: "Computes quotient and remainder together."
signature: "div_t div(int num, int denom);"
source: https://sourceware.org/glibc/manual/latest/html_node/Integer-Division.html
---

Returns a [`div_t`](../type.div_t/) with `quot = num / denom` and `rem = num % denom`. Since C99 integer division always truncates toward zero, so this is the same as using `/` and `%`. `ldiv` does the same for `long`.
