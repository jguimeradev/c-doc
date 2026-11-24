---
name: "abs"
kind: fn
header: stdlib
summary: "Absolute value of an int."
signature: "int abs(int n);"
source: https://sourceware.org/glibc/manual/latest/html_node/Absolute-Value.html
---

`abs(INT_MIN)` overflows (undefined behavior) on two's-complement machines. See also `labs` for `long` and [`fabs`](/math/fn.fabs/) for `double`.
