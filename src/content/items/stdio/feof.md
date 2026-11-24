---
name: "feof"
kind: fn
header: stdio
summary: "Tests the end-of-file indicator of a stream."
signature: "int feof(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/EOF-and-Errors.html
---

Returns nonzero if the end-of-file indicator for `stream` is set.

<div class="warning">

The indicator is set only **after** a read has tried to go past the end. Don't write `while (!feof(fp))` as a read loop; test the result of the read itself, and use `feof` afterwards to explain why it stopped.

</div>

```c
while ((c = getc(fp)) != EOF)
    ...;
if (ferror(fp))
    perror("read");
```
