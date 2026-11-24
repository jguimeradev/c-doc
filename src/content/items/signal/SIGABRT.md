---
name: "SIGABRT"
kind: macro
header: signal
summary: "Abnormal termination."
signature: "#define SIGABRT /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Signals.html
---

Abnormal termination, e.g. from [`abort`](/stdlib/fn.abort/).

One of the six signals ISO C defines; POSIX adds many more (`SIGHUP`, `SIGCHLD`, …). See [`signal`](../fn.signal/).
