---
name: "strtol"
kind: fn
header: stdlib
summary: "Converts a string to long in the given base, with error detection."
signature: "long strtol(const char *s, char **endp, int base);"
source: https://sourceware.org/glibc/manual/latest/html_node/Parsing-of-Integers.html
---

Like [`strtod`](../fn.strtod/) but for integers. `base` may be 2–36; letters `a`–`z` (either case) stand for digits 10–35. With `base` 0 the prefix decides: `0x`/`0X` means hexadecimal, a leading `0` means octal, otherwise decimal.

On overflow returns `LONG_MAX` or `LONG_MIN` and sets `errno` to `ERANGE`.

```c
long parse_port(const char *s)
{
    char *end;
    errno = 0;
    long v = strtol(s, &end, 10);
    if (end == s || *end != '\0' || errno == ERANGE || v < 1 || v > 65535)
        return -1;
    return v;
}
```
