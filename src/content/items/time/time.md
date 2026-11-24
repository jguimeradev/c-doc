---
name: "time"
kind: fn
header: time
summary: "Returns the current calendar time."
signature: "time_t time(time_t *tp);"
source: https://sourceware.org/glibc/manual/latest/html_node/Getting-the-Time.html
---

Returns the current time, or `(time_t)-1` if unavailable. If `tp` isn't null, the result is also stored in `*tp`.

```c
time_t now = time(NULL);
printf("%s", ctime(&now));
```
