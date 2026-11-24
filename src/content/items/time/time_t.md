---
name: "time_t"
kind: type
header: time
summary: "Arithmetic type representing calendar time."
signature: "typedef /* arithmetic type */ time_t;"
source: https://sourceware.org/glibc/manual/latest/html_node/Time-Types.html
---

On POSIX systems, the number of seconds since 1970-01-01 00:00:00 UTC (the Unix epoch). Use [`difftime`](../fn.difftime/) to subtract two values portably.
