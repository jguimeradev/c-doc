---
name: "clearerr"
kind: fn
header: stdio
summary: "Clears the end-of-file and error indicators of a stream."
signature: "void clearerr(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Error-Recovery.html
---

Both indicators are "sticky": once set they stay set until cleared by `clearerr`, [`rewind`](../fn.rewind/), or a successful positioning call.
