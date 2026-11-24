---
name: "ctime"
kind: fn
header: time
summary: "Converts calendar time to a local-time string. Deprecated in C23."
signature: "char *ctime(const time_t *tp);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatting-Calendar-Time.html
---

Equivalent to `asctime(localtime(tp))`. Same static-buffer caveat as [`asctime`](../fn.asctime/).
