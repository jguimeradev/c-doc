---
name: strlen
kind: fn
header: string
summary: Returns the length of a null-terminated string in bytes.
signature: "size_t strlen(const char *s);"
safety: "MT-Safe | AS-Safe | AC-Safe"
source: https://sourceware.org/glibc/manual/latest/html_node/String-Length.html
---

Returns the length of `s` in bytes — the offset of the terminating null byte.

```c
strlen("hello, world");   /* ⇒ 12 */
```

## Notes

- Applied to an array, it returns the length of the string stored there, **not** the allocated size of the array. Use `sizeof` for that.
- For multibyte-encoded strings (e.g. UTF-8), the result is a byte count, not a character count.
