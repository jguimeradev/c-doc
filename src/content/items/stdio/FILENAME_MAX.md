---
name: "FILENAME_MAX"
kind: macro
header: stdio
summary: "Size for a char array large enough to hold the longest file name."
signature: "#define FILENAME_MAX /* implementation-defined */"
source: https://sourceware.org/glibc/manual/latest/html_node/Limits-for-Files.html
---

A size suitable for an array meant to hold a file name. On systems with no fixed limit it is just a large value, so don't rely on it to be exact.
