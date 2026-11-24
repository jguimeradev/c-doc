---
name: "fgets"
kind: fn
header: stdio
summary: "Reads a line, at most n-1 characters, into a buffer."
signature: "char *fgets(char *s, int n, FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Line-Input.html
---

Reads at most `n - 1` characters into `s`, stopping after a newline (which **is** stored) or at end of file. The result is always null-terminated.

## Return value

`s`, or a null pointer if end of file or an error occurred before any character was read.

## Notes

If the line is longer than the buffer, the rest stays in the stream for the next call; detect this by checking whether the last character is `'\n'`. A common idiom to strip the newline:

```c
char buf[128];
if (fgets(buf, sizeof buf, stdin) != NULL)
    buf[strcspn(buf, "\n")] = '\0';
```
