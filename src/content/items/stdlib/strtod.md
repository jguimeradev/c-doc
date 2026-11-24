---
name: "strtod"
kind: fn
header: stdlib
summary: "Converts a string to double, reporting where parsing stopped."
signature: "double strtod(const char *s, char **endp);"
source: https://sourceware.org/glibc/manual/latest/html_node/Parsing-of-Floats.html
---

Skips leading white space, converts the longest prefix of `s` that looks like a floating-point number, and stores a pointer to the first unconverted character in `*endp` (unless `endp` is null).

## Return value

The converted value; `0` if nothing could be converted (and then `*endp == s`). On overflow returns `±HUGE_VAL` and sets `errno` to `ERANGE`; on underflow returns a value no larger than the smallest normalized positive number and may set `ERANGE`.

```c
char *end;
errno = 0;
double x = strtod(text, &end);
if (end == text || *end != '\0' || errno == ERANGE)
    fprintf(stderr, "not a valid number: %s\n", text);
```
