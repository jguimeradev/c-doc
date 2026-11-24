---
name: "FILE"
kind: type
header: stdio
summary: "The type of a stream object, used through FILE * pointers."
signature: "typedef /* opaque */ FILE;"
source: https://sourceware.org/glibc/manual/latest/html_node/Streams.html
---

An object of type `FILE` holds everything the library needs to control a stream: its buffer, the current position, and the error and end-of-file indicators.

You never create or inspect a `FILE` directly. You get a `FILE *` from [`fopen`](../fn.fopen/) (or use one of [`stdin`](../macro.stdin/), [`stdout`](../macro.stdout/), [`stderr`](../macro.stderr/)) and pass it to the stream functions.
