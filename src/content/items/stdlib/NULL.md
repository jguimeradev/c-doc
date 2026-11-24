---
name: "NULL"
kind: macro
header: stdlib
summary: "The null pointer constant."
signature: "#define NULL ((void *)0) /* or 0 */"
source: https://sourceware.org/glibc/manual/latest/html_node/Null-Pointer-Constant.html
---

A null pointer constant, also defined in `<stdio.h>`, `<string.h>`, `<stddef.h>` and `<time.h>`. A null pointer compares unequal to a pointer to any object, so functions return it to mean "nothing" or "failure".

The integer constant `0` is also a null pointer constant in pointer context; `NULL` just makes the intent visible. C23 adds `nullptr`.
