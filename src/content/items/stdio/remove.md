---
name: "remove"
kind: fn
header: stdio
summary: "Deletes a file."
signature: "int remove(const char *filename);"
source: https://sourceware.org/glibc/manual/latest/html_node/Deleting-Files.html
---

Removes the named file, so later attempts to open it fail. Returns `0` on success, nonzero on failure.
