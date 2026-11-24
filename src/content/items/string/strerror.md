---
name: strerror
kind: fn
header: string
summary: Maps an error code to a descriptive message string.
signature: "char *strerror(int errnum);"
source: https://sourceware.org/glibc/manual/latest/html_node/Error-Messages.html
---

Maps the error code `errnum` (normally the value of `errno`) to a descriptive message, translated according to the current locale.

`strerror` preserves `errno` and cannot fail.

<div class="warning">

Do not modify the returned string. It is invalidated by later calls to `strerror` or `strerror_l`, or when the calling thread exits.

</div>

## Notes

Because the previous state can't be restored, **library code should avoid `strerror`**. Prefer `strerror_r`, `snprintf` with `%m`, `strerrorname_np`, or `strerrordesc_np`.

```c
fprintf(stderr, "open failed: %s\n", strerror(errno));
```
