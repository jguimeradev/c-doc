---
name: "clock"
kind: fn
header: time
summary: "Processor time used by the program since it started."
signature: "clock_t clock(void);"
source: https://sourceware.org/glibc/manual/latest/html_node/CPU-Time.html
---

Returns processor (CPU) time, not wall-clock time, or `(clock_t)-1` if unavailable. Measure intervals as differences between two calls; see [`CLOCKS_PER_SEC`](../macro.CLOCKS_PER_SEC/).
