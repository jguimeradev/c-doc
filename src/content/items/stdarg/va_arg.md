---
name: "va_arg"
kind: macro
header: stdarg
summary: "Returns the next unnamed argument, of the given type."
signature: "type va_arg(va_list ap, type);"
safety: "MT-Safe race:ap | AS-Safe | AC-Unsafe corrupt"
source: https://sourceware.org/glibc/manual/latest/html_node/Argument-Macros.html
---

Each call yields the next argument and advances `ap`. There is no way to know how many arguments remain; the function must work that out (from a count, a format string, or a sentinel like `NULL`).

`type` must match the promoted type of the actual argument: `char` and `short` are passed as `int`, and `float` as `double`. So write `va_arg(ap, int)` and `va_arg(ap, double)`, never `va_arg(ap, char)`.
