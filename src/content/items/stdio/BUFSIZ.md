---
name: "BUFSIZ"
kind: macro
header: stdio
summary: "Size of the buffer used by setbuf."
signature: "#define BUFSIZ /* at least 256 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Controlling-Buffering.html
---

An integer constant giving a reasonable buffer size for [`setbuf`](../fn.setbuf/). glibc uses 8192.
