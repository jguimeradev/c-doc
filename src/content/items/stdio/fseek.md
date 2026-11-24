---
name: "fseek"
kind: fn
header: stdio
summary: "Sets the file position of a stream."
signature: "int fseek(FILE *stream, long offset, int origin);"
source: https://sourceware.org/glibc/manual/latest/html_node/File-Positioning.html
---

Sets the position for `stream`; the next read or write starts there. `origin` is [`SEEK_SET`](../macro.SEEK_SET/), `SEEK_CUR` or `SEEK_END`.

For a **text** stream, `offset` must be zero or a value returned by [`ftell`](../fn.ftell/) with `origin` `SEEK_SET`.

Returns `0` on success, nonzero on error.
