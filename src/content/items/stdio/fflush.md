---
name: "fflush"
kind: fn
header: stdio
summary: "Writes any buffered output for a stream."
signature: "int fflush(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Flushing-Buffers.html
---

Causes any buffered but unwritten data for the output stream `stream` to be delivered to the host. `fflush(NULL)` flushes **all** output streams.

`fflush` on an input stream is undefined in ISO C (glibc gives it a defined meaning, but don't rely on it).

## Return value

`0` on success, [`EOF`](../macro.EOF/) on a write error.

```c
printf("Enter your name: ");
fflush(stdout);   /* make the prompt visible before reading */
```
