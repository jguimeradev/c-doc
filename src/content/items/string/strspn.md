---
name: "strspn"
kind: fn
header: string
summary: "Length of the prefix of cs made only of characters in ct."
signature: "size_t strspn(const char *cs, const char *ct);"
source: https://sourceware.org/glibc/manual/latest/html_node/Search-Functions.html
---

```c
strspn("   indented", " \t");   /* ⇒ 3 */
```
