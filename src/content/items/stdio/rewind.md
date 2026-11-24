---
name: "rewind"
kind: fn
header: stdio
summary: "Sets the file position to the beginning and clears the error indicator."
signature: "void rewind(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/File-Positioning.html
---

Equivalent to `fseek(stream, 0L, SEEK_SET); clearerr(stream);`.
