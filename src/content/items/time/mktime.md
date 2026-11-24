---
name: "mktime"
kind: fn
header: time
summary: "Converts local broken-down time to calendar time, normalizing the struct."
signature: "time_t mktime(struct tm *tp);"
safety: "MT-Safe env locale | AS-Unsafe heap lock | AC-Unsafe lock mem fd"
source: https://sourceware.org/glibc/manual/latest/html_node/Broken_002ddown-Time.html
---

Ignores `tm_wday` and `tm_yday` on input, and accepts out-of-range values in the other members, normalizing them. That makes it the easy way to do date arithmetic:

```c
struct tm t = *localtime(&(time_t){time(NULL)});
t.tm_mday += 30;        /* 30 days from now; month rollover is handled */
t.tm_isdst = -1;        /* let mktime work out DST */
time_t later = mktime(&t);
```

Returns `(time_t)-1` if the time can't be represented, leaving `*tp` unmodified.
