---
name: "fpos_t"
kind: type
header: stdio
summary: "An object type that can record any position in a file."
signature: "typedef /* implementation-defined */ fpos_t;"
source: https://sourceware.org/glibc/manual/latest/html_node/Portable-Positioning.html
---

Used by [`fgetpos`](../fn.fgetpos/) and [`fsetpos`](../fn.fsetpos/), which work even for files too large for a `long` offset.
