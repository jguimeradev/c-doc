---
name: "FOPEN_MAX"
kind: macro
header: stdio
summary: "Minimum number of streams that can be open at once."
signature: "#define FOPEN_MAX /* at least 8 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Opening-Streams.html
---

The implementation guarantees at least this many files can be open simultaneously, including the three standard streams.
