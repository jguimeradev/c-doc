---
name: "abort"
kind: fn
header: stdlib
summary: "Causes abnormal program termination."
signature: "_Noreturn void abort(void);"
source: https://sourceware.org/glibc/manual/latest/html_node/Aborting-a-Program.html
---

Raises `SIGABRT`. Unless a handler for that signal never returns, the program terminates **without** calling [`atexit`](../fn.atexit/) functions; whether open streams are flushed is implementation-defined. Used by [`assert`](/assert/macro.assert/).
