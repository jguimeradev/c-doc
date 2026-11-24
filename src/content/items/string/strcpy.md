---
name: "strcpy"
kind: fn
header: string
summary: "Copies a string, including its terminating null byte."
signature: "char *strcpy(char *restrict s, const char *restrict ct);"
source: https://sourceware.org/glibc/manual/latest/html_node/Copying-Strings-and-Arrays.html
---

Copies `ct` into `s` and returns `s`. The destination must be large enough; `strcpy` cannot check.

The classic pointer version shows how compactly C expresses it:

```c
char *my_strcpy(char *s, const char *t)
{
    char *r = s;
    while ((*s++ = *t++) != '\0')
        ;
    return r;
}
```
