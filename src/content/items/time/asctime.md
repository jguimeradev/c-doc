---
name: "asctime"
kind: fn
header: time
summary: "Converts broken-down time to a fixed-format string. Deprecated in C23."
signature: "char *asctime(const struct tm *tp);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatting-Calendar-Time.html
---

Produces a 26-byte string like `"Sun Jan  3 15:14:13 1988\n"` in a static buffer overwritten by each call. Deprecated in C23; use [`strftime`](../fn.strftime/).
