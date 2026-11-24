---
name: "strrchr"
kind: fn
header: string
summary: "Finds the last occurrence of a character in a string."
signature: "char *strrchr(const char *cs, int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Search-Functions.html
---

```c
const char *base = strrchr(path, '/');
base = base ? base + 1 : path;   /* file name part */
```
