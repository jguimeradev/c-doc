---
name: "atoi"
kind: fn
header: stdlib
summary: "Converts the initial part of a string to int."
signature: "int atoi(const char *s);"
source: https://sourceware.org/glibc/manual/latest/html_node/Parsing-of-Integers.html
---

Equivalent to `(int)strtol(s, NULL, 10)`, but with undefined behavior if the value is out of range. `atoi("abc")` returns `0`, the same as `atoi("0")`, so it can't report bad input. Prefer [`strtol`](../fn.strtol/).

A hand-written version shows the idea:

```c
int my_atoi(const char *s)
{
    int n = 0, sign = 1;
    while (isspace((unsigned char)*s))
        s++;
    if (*s == '+' || *s == '-')
        sign = (*s++ == '-') ? -1 : 1;
    while (isdigit((unsigned char)*s))
        n = 10 * n + (*s++ - '0');
    return sign * n;
}
```
