---
name: "freopen"
kind: fn
header: stdio
summary: "Closes a stream and reopens it on a different file."
signature: "FILE *freopen(const char *filename, const char *mode, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Opening-Streams.html
---

Closes the file associated with `stream` (ignoring errors), then opens `filename` with `mode` as for [`fopen`](../fn.fopen/) and associates it with the same `stream` object.

Its main use is to redirect a standard stream:

```c
if (freopen("log.txt", "a", stdout) == NULL)
    perror("log.txt");
```

## Return value

`stream` on success, or a null pointer on failure.
