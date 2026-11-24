---
name: "sprintf"
kind: fn
header: stdio
summary: "Formats output into a string, with no bounds checking."
signature: "int sprintf(char *s, const char *format, ...);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatted-Output-Functions.html
---

Same as [`printf`](../fn.printf/), but the output is written to the array `s` and terminated with `'\0'`. Returns the number of characters written, not counting the null.

<div class="warning">

`sprintf` cannot know how big `s` is and will happily overflow it. Use [`snprintf`](../fn.snprintf/).

</div>
