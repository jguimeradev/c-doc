---
name: "CLOCKS_PER_SEC"
kind: macro
header: time
summary: "Number of clock_t ticks per second."
signature: "#define CLOCKS_PER_SEC /* clock_t ticks per second */"
source: https://sourceware.org/glibc/manual/latest/html_node/CPU-Time.html
---

POSIX requires it to be 1000000 regardless of the clock's actual resolution.

```c
clock_t start = clock();
work();
double secs = (double)(clock() - start) / CLOCKS_PER_SEC;
```
