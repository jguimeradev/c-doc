---
name: "stdout"
kind: macro
header: stdio
summary: "The standard output stream."
signature: "extern FILE *stdout;"
source: https://sourceware.org/glibc/manual/latest/html_node/Standard-Streams.html
---

The stream a program writes to by default: usually the terminal, or whatever the shell redirected with `>` or a pipe. [`putchar`](../fn.putchar/), [`puts`](../fn.puts/) and [`printf`](../fn.printf/) write to it.

When connected to a terminal, `stdout` is normally **line buffered**; otherwise it is fully buffered. Call [`fflush`](../fn.fflush/) if output must appear immediately.
