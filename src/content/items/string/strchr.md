---
name: "strchr"
kind: fn
header: string
summary: "Finds the first occurrence of a character in a string."
signature: "char *strchr(const char *cs, int c);"
source: https://sourceware.org/glibc/manual/latest/html_node/Search-Functions.html
---

Returns a pointer to the first `c` in `cs`, or `NULL`. The terminating null counts as part of the string, so `strchr(s, '\0')` points at the end.
