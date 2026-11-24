---
name: "SIGSEGV"
kind: macro
header: signal
summary: "Invalid memory access."
signature: "#define SIGSEGV /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Signals.html
---

Invalid memory access, e.g. dereferencing a bad pointer.

One of the six signals ISO C defines; POSIX adds many more (`SIGHUP`, `SIGCHLD`, …). See [`signal`](../fn.signal/).
