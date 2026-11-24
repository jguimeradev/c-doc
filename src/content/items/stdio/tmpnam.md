---
name: "tmpnam"
kind: fn
header: stdio
summary: "Generates a file name that is not the name of an existing file."
signature: "char *tmpnam(char s[L_tmpnam]);"
source: https://sourceware.org/glibc/manual/latest/html_node/Temporary-Files.html
---

With a null argument, returns a pointer to an internal static array; otherwise stores the name in `s` and returns `s`.

<div class="warning">

Between generating the name and opening the file, another process may create it. Prefer [`tmpfile`](../fn.tmpfile/), or `mkstemp` on POSIX systems.

</div>
