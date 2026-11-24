---
name: "gets"
kind: fn
header: stdio
summary: "Removed in C11. Reads a line with no bounds check; never use it."
signature: "char *gets(char *s);"
standard: "ISO C (removed in C11)"
source: https://sourceware.org/glibc/manual/latest/html_node/Line-Input.html
---

<div class="warning">

**Removed from the language in C11.** `gets` reads a line into `s` with no way to limit its length, so any long enough input overflows the buffer. It was famously exploited by the 1988 Morris worm. Use [`fgets`](../fn.fgets/).

</div>
