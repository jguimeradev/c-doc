---
name: snprintf
kind: fn
header: stdio
summary: Formats output into a character buffer, never writing more than size bytes.
signature: "int snprintf(char *s, size_t size, const char *template, ...);"
standard: ISO C99
source: https://sourceware.org/glibc/manual/latest/html_node/Formatted-Output-Functions.html
---

Like `sprintf`, but writes at most `size` bytes (including the terminating null byte) into `s`.

## Return value

The number of characters that **would have been written** if `size` were large enough, not counting the null terminator. If that value is `>= size`, the output was truncated.

## Examples

Detecting truncation:

```c
char buf[16];
int n = snprintf(buf, sizeof buf, "user-%d", id);
if (n < 0 || (size_t)n >= sizeof buf) {
    /* error or truncated */
}
```

Sizing a buffer exactly:

```c
int len = snprintf(NULL, 0, "%s/%s", dir, name);
char *path = malloc(len + 1);
snprintf(path, len + 1, "%s/%s", dir, name);
```
