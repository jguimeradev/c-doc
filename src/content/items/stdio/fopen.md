---
name: fopen
kind: fn
header: stdio
summary: Opens a file and returns a stream for reading and/or writing it.
signature: "FILE *fopen(const char *filename, const char *opentype);"
source: https://sourceware.org/glibc/manual/latest/html_node/Opening-Streams.html
---

Opens a stream for I/O to the file `filename` and returns a pointer to the stream. The `opentype` string controls how the file is opened.

## Modes

`opentype` must begin with one of:

| Mode | Meaning |
|---|---|
| `"r"` | Open an existing file for reading only. |
| `"w"` | Open for writing only. Truncates an existing file, or creates a new one. |
| `"a"` | Open for appending. Existing contents are kept; writes go to the end. |
| `"r+"` | Open an existing file for reading and writing, positioned at the start. |
| `"w+"` | Open for reading and writing. Truncates or creates the file. |
| `"a+"` | Open or create for reading and appending. Reads start at the beginning; writes always append. |

Additional characters may follow: `"b"` requests a binary stream (no effect on POSIX), and `"x"` makes `fopen` fail if the file already exists (like `O_EXCL`). glibc also accepts `"c"`, `"e"` (close-on-exec), `"m"` (mmap for reading) and `",ccs=STRING"`.

## Return value

A pointer to the stream, or a null pointer if the open fails.

<div class="warning">

On a stream opened with `+`, you must call `fflush` or a positioning function such as `fseek` when switching between reading and writing.

</div>

## Examples

```c
FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("data.txt");
    return EXIT_FAILURE;
}
```
