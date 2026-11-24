---
name: "sig_atomic_t"
kind: type
header: signal
summary: "Integer type that can be accessed atomically with respect to signals."
signature: "typedef /* integer type */ sig_atomic_t;"
source: https://sourceware.org/glibc/manual/latest/html_node/Atomic-Types.html
---

Declare flags shared with a signal handler as `volatile sig_atomic_t`. See [`signal`](../fn.signal/).
