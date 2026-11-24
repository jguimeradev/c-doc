---
name: "strcspn"
kind: fn
header: string
summary: "Length of the prefix of cs containing no characters from ct."
signature: "size_t strcspn(const char *cs, const char *ct);"
source: https://sourceware.org/glibc/manual/latest/html_node/Search-Functions.html
---

```c
buf[strcspn(buf, "\r\n")] = '\0';   /* chop line ending */
```
