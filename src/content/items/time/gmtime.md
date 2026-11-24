---
name: "gmtime"
kind: fn
header: time
summary: "Converts calendar time to broken-down UTC time."
signature: "struct tm *gmtime(const time_t *tp);"
safety: "MT-Unsafe race:tmbuf env locale | AS-Unsafe heap lock | AC-Unsafe lock mem fd"
source: https://sourceware.org/glibc/manual/latest/html_node/Broken_002ddown-Time.html
---

Returns a pointer to a **static** `struct tm` that later calls overwrite (not thread-safe; POSIX offers `gmtime_r`), or `NULL` if UTC isn't available.
