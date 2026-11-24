---
name: "NDEBUG"
kind: macro
header: assert
summary: "If defined before including assert.h, disables assert."
signature: "#define NDEBUG  /* defined by you, e.g. cc -DNDEBUG */"
source: https://sourceware.org/glibc/manual/latest/html_node/Consistency-Checking.html
---

`NDEBUG` is not defined by the library; you define it (often with `-DNDEBUG` in release builds) to turn [`assert`](../macro.assert/) into a no-op.
