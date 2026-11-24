---
name: "setbuf"
kind: fn
header: stdio
summary: "Turns buffering off, or supplies a BUFSIZ-byte buffer."
signature: "void setbuf(FILE *stream, char *buf);"
source: https://sourceware.org/glibc/manual/latest/html_node/Controlling-Buffering.html
---

If `buf` is null, buffering is turned off; otherwise it is equivalent to `setvbuf(stream, buf, _IOFBF, BUFSIZ)`. See [`setvbuf`](../fn.setvbuf/).
