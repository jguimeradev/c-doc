---
name: "setvbuf"
kind: fn
header: stdio
summary: "Controls the buffering of a stream."
signature: "int setvbuf(FILE *stream, char *buf, int mode, size_t size);"
source: https://sourceware.org/glibc/manual/latest/html_node/Controlling-Buffering.html
---

Must be called after the stream is opened and before any other operation on it. `mode` is one of:

| Mode | Behavior |
|---|---|
| `_IOFBF` | full buffering |
| `_IOLBF` | line buffering: flush on newline |
| `_IONBF` | no buffering |

If `buf` is not null it is used as the buffer (of `size` bytes); otherwise the library allocates one. Returns `0` on success.

```c
setvbuf(stdout, NULL, _IONBF, 0);   /* unbuffered stdout */
```
