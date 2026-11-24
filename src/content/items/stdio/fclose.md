---
name: "fclose"
kind: fn
header: stdio
summary: "Flushes and closes a stream."
signature: "int fclose(FILE *stream);"
source: https://sourceware.org/glibc/manual/latest/html_node/Closing-Streams.html
---

Writes any buffered output for `stream`, discards unread buffered input, frees any buffer the library allocated, and closes the file.

## Return value

`0` on success, [`EOF`](../macro.EOF/) if an error was detected. **Check it when writing:** a failure here may be the first sign that data never reached the disk (for example, a full disk).

Every stream still open is closed automatically when the program ends normally, but closing explicitly lets you check for errors and frees one of the limited [`FOPEN_MAX`](../macro.FOPEN_MAX/) slots.

```c
if (fclose(out) == EOF) {
    perror("write failed");
    return EXIT_FAILURE;
}
```
