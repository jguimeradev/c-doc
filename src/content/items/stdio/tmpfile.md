---
name: "tmpfile"
kind: fn
header: stdio
summary: "Creates a temporary binary file that is removed when closed."
signature: "FILE *tmpfile(void);"
source: https://sourceware.org/glibc/manual/latest/html_node/Temporary-Files.html
---

Creates a temporary file opened with mode `"wb+"`. It is deleted automatically when closed or when the program terminates normally.

Returns a stream, or a null pointer if the file could not be created.
