---
name: "stdin"
kind: macro
header: stdio
summary: "The standard input stream."
signature: "extern FILE *stdin;"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Streams.html
---

The stream a program reads by default: usually the keyboard, or whatever the shell redirected with `<` or a pipe. [`getchar`](../fn.getchar/) and [`scanf`](../fn.scanf/) read from it.
