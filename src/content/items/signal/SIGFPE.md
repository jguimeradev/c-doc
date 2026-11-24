---
name: "SIGFPE"
kind: macro
header: signal
summary: "Arithmetic error."
signature: "#define SIGFPE /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Signals.html
---

Arithmetic error, e.g. integer division by zero or overflow.

One of the six signals ISO C defines; POSIX adds many more (`SIGHUP`, `SIGCHLD`, …). See [`signal`](../fn.signal/).
