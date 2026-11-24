---
name: "SEEK_SET"
kind: macro
header: stdio
summary: "Origin values for fseek: start of file, current position, end of file."
signature: "#define SEEK_SET 0\n#define SEEK_CUR 1\n#define SEEK_END 2"
source: https://sourceware.org/glibc/manual/latest/html_node/File-Positioning.html
---

The third argument to [`fseek`](../fn.fseek/) says what the offset is relative to:

| Macro | Offset measured from |
|---|---|
| `SEEK_SET` | the beginning of the file |
| `SEEK_CUR` | the current position |
| `SEEK_END` | the end of the file |
