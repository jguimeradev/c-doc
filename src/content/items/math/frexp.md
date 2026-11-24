---
name: "frexp"
kind: fn
header: math
summary: "Splits x into a fraction in [1/2, 1) and a power of 2."
signature: "double frexp(double x, int *exp);"
source: https://sourceware.org/glibc/manual/latest/html_node/Normalization-Functions.html
---

Splits x into a fraction in [1/2, 1) and a power of 2.

Returns `m` with `x == m * 2^*exp`. If `x` is zero, both parts are zero.

```c
int e;
double m = frexp(48.0, &e);   /* m = 0.75, e = 6 */
```
