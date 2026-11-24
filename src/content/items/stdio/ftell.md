---
name: "ftell"
kind: fn
header: stdio
summary: "Returns the current file position."
signature: "long ftell(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/File-Positioning.html
---

Returns the current position of `stream`, or `-1L` on error.

```c
/* size of a binary file */
fseek(fp, 0, SEEK_END);
long size = ftell(fp);
rewind(fp);
```
