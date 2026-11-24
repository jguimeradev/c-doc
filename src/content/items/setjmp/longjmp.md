---
name: "longjmp"
kind: fn
header: setjmp
summary: "Jumps back to the point saved by setjmp."
signature: "_Noreturn void longjmp(jmp_buf env, int val);"
safety: "MT-Safe | AS-Unsafe plugin corrupt lock/hurd | AC-Unsafe corrupt lock/hurd"
source: https://sourceware.org/glibc/manual/latest/html_node/Non_002dLocal-Details.html
---

Restores the state saved by the most recent [`setjmp`](../macro.setjmp/) with `env`; execution continues as if that `setjmp` had just returned `val`. If `val` is `0`, `setjmp` returns `1` instead.

The function that called `setjmp` must not have returned in the meantime.
