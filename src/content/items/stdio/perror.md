---
name: perror
kind: fn
header: stdio
summary: Prints a message followed by a description of the current errno to stderr.
signature: "void perror(const char *message);"
safety: "MT-Unsafe race:stderr | AS-Unsafe corrupt i18n heap lock | AC-Unsafe corrupt lock mem fd"
source: https://sourceware.org/glibc/manual/latest/html_node/Error-Messages.html
---

Prints an error message to `stderr`: the string `message`, a colon, a space, and the error text corresponding to `errno`, followed by a newline.

If `message` is a null pointer or an empty string, only the error text is printed.

`perror` and [`strerror`](../../string/fn.strerror/) produce the same message for a given error code under the same locale. The exact text varies between systems.

## Examples

```c
if (fopen(path, "r") == NULL)
    perror(path);   /* e.g. "config.ini: No such file or directory" */
```
