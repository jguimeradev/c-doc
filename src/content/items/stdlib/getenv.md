---
name: "getenv"
kind: fn
header: stdlib
summary: "Looks up an environment variable."
signature: "char *getenv(const char *name);"
source: https://sourceware.org/glibc/manual/latest/html_node/Environment-Access.html
---

Returns the value string associated with `name`, or a null pointer if there is none. Don't modify the returned string.

```c
const char *home = getenv("HOME");
if (home == NULL)
    home = "/";
```
