---
name: "system"
kind: fn
header: stdlib
summary: "Passes a command string to the host command processor."
signature: "int system(const char *s);"
source: https://sourceware.org/glibc/manual/latest/html_node/Running-a-Command.html
---

Runs `s` as a shell command and returns its status (implementation-dependent; on POSIX, decode it with `WEXITSTATUS`). `system(NULL)` returns nonzero if a command processor exists.

<div class="warning">

Never build the command from untrusted input; anything the shell interprets (`;`, `|`, `$(…)`) becomes a command injection.

</div>
