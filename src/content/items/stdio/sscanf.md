---
name: "sscanf"
kind: fn
header: stdio
summary: "Reads formatted input from a string."
signature: "int sscanf(const char *s, const char *format, ...);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatted-Input-Functions.html
---

Like [`scanf`](../fn.scanf/), but takes its input from the string `s`. Reaching the end of `s` is equivalent to end of file.

```c
char line[256];
int x, y;
while (fgets(line, sizeof line, stdin) != NULL) {
    if (sscanf(line, "%d,%d", &x, &y) != 2) {
        fprintf(stderr, "bad line: %s", line);
        continue;
    }
    /* use x, y */
}
```
