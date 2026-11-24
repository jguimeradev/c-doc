---
name: strcmp
kind: fn
header: string
summary: Compares two strings byte by byte.
signature: "int strcmp(const char *s1, const char *s2);"
safety: "MT-Safe | AS-Safe | AC-Safe"
source: https://sourceware.org/glibc/manual/latest/html_node/String_002fArray-Comparison.html
---

Compares `s1` against `s2`.

## Return value

- `0` if the strings are equal;
- a negative value if `s1` is less than `s2`;
- a positive value if `s1` is greater than `s2`.

The sign is determined by the first differing byte, interpreted as `unsigned char`. If `s1` is an initial substring of `s2`, then `s1` is less than `s2`.

## Notes

`strcmp` ignores language-specific collation; use `strcoll` for that.

```c
if (strcmp(argv[1], "--help") == 0)
    usage();
```
