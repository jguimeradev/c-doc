---
name: "strcat"
kind: fn
header: string
summary: "Appends one string to the end of another."
signature: "char *strcat(char *restrict s, const char *restrict ct);"
source: https://sourceware.org/glibc/manual/latest/html_node/Concatenating-Strings.html
---

Appends `ct` to `s` (overwriting `s`'s terminating null) and returns `s`. `s` must have room for the result.
