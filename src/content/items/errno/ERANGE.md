---
name: "ERANGE"
kind: macro
header: errno
summary: "Range error: a result too large or small to represent."
signature: "#define ERANGE /* positive int */"
source: https://sourceware.org/glibc/manual/latest/html_node/Error-Codes.html
---

Set by math functions on overflow (and possibly underflow), and by [`strtol`](/stdlib/fn.strtol/)-family functions when the value doesn't fit.
