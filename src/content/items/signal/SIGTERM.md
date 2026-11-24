---
name: "SIGTERM"
kind: macro
header: signal
summary: "Termination request sent to the program."
signature: "#define SIGTERM /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Signals.html
---

Termination request sent to the program.

One of the six signals ISO C defines; POSIX adds many more (`SIGHUP`, `SIGCHLD`, …). See [`signal`](../fn.signal/).
