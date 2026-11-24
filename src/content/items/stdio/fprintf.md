---
name: fprintf
kind: fn
header: stdio
summary: Prints formatted output to the given stream.
signature: "int fprintf(FILE *stream, const char *template, ...);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatted-Output-Functions.html
---

Just like [`printf`](../fn.printf/), except the output is written to `stream` instead of `stdout`.

## Return value

The number of characters printed, or a negative value on an output error. Sets the same `errno` values as `printf`.

## Examples

```c
fprintf(stderr, "Error: %s\n", message);
```
