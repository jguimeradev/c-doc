---
name: "strftime"
kind: fn
header: time
summary: "Formats broken-down time into a string under control of a format."
signature: "size_t strftime(char *s, size_t smax, const char *fmt, const struct tm *tp);"
safety: "MT-Safe env locale | AS-Unsafe corrupt heap lock dlopen | AC-Unsafe corrupt lock mem fd"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatting-Calendar-Time.html
---

Like a `printf` for dates. Writes at most `smax` characters into `s` and returns the number written (excluding the null), or `0` if the result didn't fit.

| Spec | Meaning | Spec | Meaning |
|---|---|---|---|
| `%a` / `%A` | weekday name, abbreviated / full | `%p` | AM or PM |
| `%b` / `%B` | month name, abbreviated / full | `%S` | second, 00–60 |
| `%c` | locale's date and time | `%U` | week of year, Sunday first |
| `%d` | day of month, 01–31 | `%w` | weekday, 0–6, Sunday = 0 |
| `%H` | hour, 00–23 | `%x` / `%X` | locale's date / time |
| `%I` | hour, 01–12 | `%y` / `%Y` | year without / with century |
| `%j` | day of year, 001–366 | `%Z` | time zone name |
| `%m` | month, 01–12 | `%F` | `%Y-%m-%d` (C99) |
| `%M` | minute, 00–59 | `%%` | a literal `%` |

```c
char buf[64];
time_t now = time(NULL);
strftime(buf, sizeof buf, "%Y-%m-%d %H:%M:%S", localtime(&now));
puts(buf);
```
