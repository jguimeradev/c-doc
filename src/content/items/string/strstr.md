---
name: "strstr"
kind: fn
header: string
summary: "Finds the first occurrence of a substring."
signature: "char *strstr(const char *cs, const char *ct);"
source: https://sourceware.org/glibc/manual/latest/html_node/Search-Functions.html
---

Returns a pointer to the first occurrence of `ct` in `cs`, or `NULL`. An empty `ct` matches at `cs`.
