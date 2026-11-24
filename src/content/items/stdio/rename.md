---
name: "rename"
kind: fn
header: stdio
summary: "Changes the name of a file."
signature: "int rename(const char *oldname, const char *newname);"
source: https://sourceware.org/glibc/manual/latest/html_node/Renaming-Files.html
---

Returns `0` on success, nonzero on failure. Whether an existing `newname` is replaced is implementation-defined in ISO C; POSIX says it is replaced atomically, which makes "write to temp file, then rename" a safe way to update a file.
