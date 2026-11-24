---
name: "tolower"
kind: fn
header: ctype
summary: "Converts an upper-case letter to lower case."
signature: "int tolower(int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Case-Conversion.html
---

Returns the lower-case equivalent of `c` if it is an upper-case letter; otherwise returns `c` unchanged.

```c
for (char *p = s; *p; p++)
    *p = tolower((unsigned char)*p);
```

In ASCII you could write `c - 'A' + 'a'`, but `tolower` is portable to other character sets and locales.
