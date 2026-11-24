---
name: "difftime"
kind: fn
header: time
summary: "Returns time2 - time1 in seconds."
signature: "double difftime(time_t time2, time_t time1);"
source: https://sourceware.org/glibc/manual/latest/html_node/Calculating-Elapsed-Time.html
---

Portable even where `time_t` isn't a plain count of seconds.
