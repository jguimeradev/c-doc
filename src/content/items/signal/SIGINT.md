---
name: "SIGINT"
kind: macro
header: signal
summary: "Interactive attention signal."
signature: "#define SIGINT /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Signals.html
---

Interactive attention signal, e.g. Ctrl-C.

One of the six signals ISO C defines; POSIX adds many more (`SIGHUP`, `SIGCHLD`, …). See [`signal`](../fn.signal/).
