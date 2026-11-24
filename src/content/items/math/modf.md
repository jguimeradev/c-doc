---
name: "modf"
kind: fn
header: math
summary: "Splits x into integral and fractional parts."
signature: "double modf(double x, double *ip);"
source: https://sourceware.org/glibc/manual/latest/html_node/Rounding-Functions.html
---

Splits x into integral and fractional parts.

Stores the integral part in `*ip` and returns the fractional part; both have the sign of `x`.

```c
double ip;
double frac = modf(3.75, &ip);   /* frac = 0.75, ip = 3.0 */
```
