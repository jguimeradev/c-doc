---
name: "clock_t"
kind: type
header: time
summary: "Arithmetic type representing processor time."
signature: "typedef /* arithmetic type */ clock_t;"
source: https://sourceware.org/glibc/manual/latest/html_node/CPU-Time.html
---

Returned by [`clock`](../fn.clock/). Divide by [`CLOCKS_PER_SEC`](../macro.CLOCKS_PER_SEC/) to get seconds.
