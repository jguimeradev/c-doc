---
name: "jmp_buf"
kind: type
header: setjmp
summary: "Holds the state saved by setjmp for a later longjmp."
signature: "typedef /* array type */ jmp_buf;"
source: https://sourceware.org/glibc/manual/latest/html_node/Non_002dLocal-Details.html
---

Objects of type `jmp_buf` hold the state to be restored by a non-local exit. Because it is an array type, you pass it to [`setjmp`](../macro.setjmp/) without `&`.
