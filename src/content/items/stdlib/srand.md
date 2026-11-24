---
name: "srand"
kind: fn
header: stdlib
summary: "Seeds the sequence returned by rand."
signature: "void srand(unsigned int seed);"
source: https://sourceware.org/glibc/manual/latest/html_node/ISO-Random.html
---

```c
srand((unsigned)time(NULL));   /* different sequence each run */
```
