---
name: "exit"
kind: fn
header: stdlib
summary: "Terminates the program normally."
signature: "_Noreturn void exit(int status);"
source: https://sourceware.org/glibc/manual/latest/html_node/Normal-Termination.html
---

Calls the functions registered with [`atexit`](../fn.atexit/) in reverse order of registration, flushes and closes all open streams, removes files made by [`tmpfile`](/stdio/fn.tmpfile/), and returns `status` to the environment.

`return n;` from `main` is equivalent to `exit(n)`. Use [`EXIT_SUCCESS`](../macro.EXIT_SUCCESS/) and [`EXIT_FAILURE`](../macro.EXIT_FAILURE/) for portability.
