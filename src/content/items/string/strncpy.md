---
name: "strncpy"
kind: fn
header: string
summary: "Copies at most n characters, padding with nulls. May leave s unterminated."
signature: "char *strncpy(char *restrict s, const char *restrict ct, size_t n);"
source: https://sourceware.org/glibc/manual/latest/html_node/Truncating-Strings.html
---

Copies at most `n` characters of `ct` into `s` and returns `s`. If `ct` is shorter than `n`, the rest of `s` is filled with `'\0'`.

<div class="warning">

If `ct` has `n` or more characters, **no null terminator is written**. `strncpy` was designed for fixed-width fields, not as a "safe strcpy". To copy with truncation, use `snprintf(s, n, "%s", ct)`.

</div>
