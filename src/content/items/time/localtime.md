---
name: "localtime"
kind: fn
header: time
summary: "Converts calendar time to broken-down local time."
signature: "struct tm *localtime(const time_t *tp);"
source: https://sourceware.org/glibc/manual/latest/html_node/Broken_002ddown-Time.html
---

Like [`gmtime`](../fn.gmtime/) but for the local time zone, with the same static-buffer caveat (`localtime_r` on POSIX).
