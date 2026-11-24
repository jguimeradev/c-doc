---
name: "atexit"
kind: fn
header: stdlib
summary: "Registers a function to be called at normal termination."
signature: "int atexit(void (*fcn)(void));"
source: https://sourceware.org/glibc/manual/latest/html_node/Cleanups-on-Exit.html
---

Registers `fcn` to be called by [`exit`](../fn.exit/) (or a return from `main`). At least 32 registrations are supported. Returns `0` on success.

```c
static void cleanup(void) { remove("lockfile"); }

int main(void)
{
    atexit(cleanup);
    /* ... */
}
```
