---
name: "strncat"
kind: fn
header: string
summary: "Appends at most n characters, always null-terminating."
signature: "char *strncat(char *restrict s, const char *restrict ct, size_t n);"
source: https://sourceware.org/glibc/manual/latest/html_node/Truncating-Strings.html
---

Appends at most `n` characters of `ct` to `s`, then a `'\0'`. Unlike [`strncpy`](../fn.strncpy/), the result is always terminated, but note that `n` limits the characters **appended**, not the size of `s`: room for `strlen(s) + n + 1` bytes is needed.
