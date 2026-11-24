---
chapter: unix-interface
summary: System calls, buffering experiments, directory listings and allocator extensions.
---

These exercises use POSIX interfaces. They run on Linux, macOS, the BSDs and WSL. Compile with `-D_POSIX_C_SOURCE=200809L` if your compiler hides POSIX functions in strict standard mode.

## Exercise 8-1 · tee <span class="diff easy">easy</span>

Write `tee FILE` that copies standard input both to standard output and to `FILE`, using only `open`, `read`, `write` and `close`. Add `-a` to append instead of truncating.

<details class="solution"><summary>Solution</summary>

```c
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static int write_all(int fd, const char *buf, size_t n)
{
    while (n > 0) {
        ssize_t w = write(fd, buf, n);
        if (w < 0) {
            if (errno == EINTR)
                continue;
            return -1;
        }
        buf += w;
        n -= (size_t)w;
    }
    return 0;
}

int main(int argc, char *argv[])
{
    int append = argc == 3 && strcmp(argv[1], "-a") == 0;
    if (argc != 2 + append) {
        fprintf(stderr, "usage: %s [-a] FILE\n", argv[0]);
        return 2;
    }
    const char *path = argv[1 + append];
    int fd = open(path, O_WRONLY | O_CREAT | (append ? O_APPEND : O_TRUNC), 0644);
    if (fd < 0) {
        perror(path);
        return 1;
    }

    char buf[65536];
    ssize_t n;
    while ((n = read(STDIN_FILENO, buf, sizeof buf)) > 0)
        if (write_all(STDOUT_FILENO, buf, (size_t)n) < 0 || write_all(fd, buf, (size_t)n) < 0) {
            perror("write");
            return 1;
        }
    if (n < 0)
        perror("read");
    return close(fd) < 0 || n < 0;
}
```

</details>

## Exercise 8-2 · The cost of system calls <span class="diff medium">medium</span>

Copy a 100 MB file using `read`/`write` with buffer sizes of 1, 16, 512, 4096 and 65536 bytes, and time each run. Then copy it with `getc`/`putc`. Explain the results.

<details class="hint"><summary>Hint</summary>

Create a test file with `head -c 100M /dev/urandom > big`. Take the buffer size from `argv` and use `time ./copy 512 < big > /dev/null`. With a 1-byte buffer, try a 10 MB file first.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    size_t size = argc > 1 ? strtoul(argv[1], NULL, 10) : 4096;
    char *buf = malloc(size);
    ssize_t n;

    if (buf == NULL || size == 0)
        return 1;
    while ((n = read(STDIN_FILENO, buf, size)) > 0)
        if (write(STDOUT_FILENO, buf, (size_t)n) != n)
            return 1;
    free(buf);
    return n < 0;
}
```

Rough orders of magnitude for 100 MB on a modern Linux machine (measure your own; the exact numbers vary a lot between systems):

| Buffer | Time | System calls |
|---|---|---|
| 1 | ~90 s | 200 million |
| 16 | ~6 s | 12.5 million |
| 512 | ~0.2 s | 400 thousand |
| 4096 | ~0.05 s | 50 thousand |
| 65536 | ~0.03 s | 3 thousand |
| `getc`/`putc` | ~0.3 s | buffered by stdio |

Time is almost entirely per-call overhead (switching into the kernel and back), so it's proportional to the number of calls until buffers reach a few KB. `getc`/`putc` stay fast despite handling one byte at a time because stdio batches them into large `read`s and `write`s, which is the whole point of section 8.5.

</details>

## Exercise 8-3 · Reading whole lines <span class="diff hard">hard</span>

Add `char *reader_getline(struct reader *r, size_t *len)` to the buffered reader from [section 8.5](/book/unix-interface/#85-example-an-implementation-of-buffered-input). It returns a `malloc`'d, null-terminated line of **any** length (without the newline), stores its length in `*len`, and returns `NULL` at end of input. The caller frees the result.

<details class="hint"><summary>Hint</summary>

Keep a growing buffer: start with 64 bytes, and double its capacity with [`realloc`](/stdlib/fn.realloc/) whenever it fills. Read characters with `reader_getc` until `'\n'` or end of input. If you hit end of input with nothing read, free the buffer and return `NULL`.

</details>

<details class="solution"><summary>Solution</summary>

```c
char *reader_getline(struct reader *r, size_t *len)
{
    size_t cap = 64, n = 0;
    char *line = malloc(cap);
    int c;

    if (line == NULL)
        return NULL;
    while ((c = reader_getc(r)) != -1 && c != '\n') {
        if (n + 1 == cap) {                 /* keep room for the '\0' */
            char *bigger = realloc(line, cap * 2);
            if (bigger == NULL) {
                free(line);
                return NULL;
            }
            line = bigger;
            cap *= 2;
        }
        line[n++] = (char)c;
    }
    if (c == -1 && n == 0) {                /* nothing left */
        free(line);
        return NULL;
    }
    line[n] = '\0';
    *len = n;
    return line;
}
```

Doubling (rather than growing by a fixed amount) keeps the total copying cost linear in the line length. A faster version would scan the reader's buffer with [`memchr`](/string/fn.memchr/) for `'\n'` and copy whole chunks at once.

</details>

## Exercise 8-4 · ls -l permissions <span class="diff medium">medium</span>

Extend the directory walker from [section 8.6](/book/unix-interface/#86-example-listing-directories) to print each entry's type and permissions the way `ls -l` does, for example `drwxr-xr-x` or `-rw-r--r--`.

<details class="solution"><summary>Solution</summary>

```c
#include <sys/stat.h>

/* mode_string: fill out[11] with an ls-style type and permission string */
void mode_string(mode_t m, char out[11])
{
    out[0] = S_ISDIR(m) ? 'd' : S_ISLNK(m) ? 'l' : S_ISCHR(m) ? 'c'
           : S_ISBLK(m) ? 'b' : S_ISFIFO(m) ? 'p' : S_ISSOCK(m) ? 's' : '-';

    static const mode_t bits[9] = {
        S_IRUSR, S_IWUSR, S_IXUSR, S_IRGRP, S_IWGRP, S_IXGRP, S_IROTH, S_IWOTH, S_IXOTH,
    };
    for (int i = 0; i < 9; i++)
        out[1 + i] = (m & bits[i]) ? "rwx"[i % 3] : '-';
    out[10] = '\0';
}
```

In `walk`, after `lstat` succeeds:

```c
char perms[11];
mode_string(st.st_mode, perms);
printf("%s %12lld  %s\n", perms, (long long)st.st_size, path);
```

A complete version would also show the setuid, setgid and sticky bits (`s`, `S`, `t`, `T` in the execute positions).

</details>

## Exercise 8-5 · calloc and realloc <span class="diff hard">hard</span>

Add `my_calloc(count, size)` and `my_realloc(p, n)` to the allocator in [section 8.7](/book/unix-interface/#87-example-a-storage-allocator). `my_calloc` must detect when `count * size` overflows. `my_realloc` should simply allocate, copy and free, but return the same block when it is already big enough.

<details class="hint"><summary>Hint</summary>

`count * size` overflows exactly when `size != 0 && count > SIZE_MAX / size`. For `my_realloc`, the usable size of a block is `b->size - HDR`, where `b` is found by stepping back `HDR` bytes from the user pointer.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdint.h>
#include <string.h>

void *my_calloc(size_t count, size_t size)
{
    if (size != 0 && count > SIZE_MAX / size)
        return NULL;                        /* would overflow */
    void *p = my_malloc(count * size);
    if (p != NULL)
        memset(p, 0, count * size);
    return p;
}

void *my_realloc(void *p, size_t n)
{
    if (p == NULL)
        return my_malloc(n);
    if (n == 0) {
        my_free(p);
        return NULL;
    }
    struct block *b = (struct block *)((unsigned char *)p - HDR);
    size_t usable = b->size - HDR;
    if (n <= usable)
        return p;                           /* already big enough */

    void *q = my_malloc(n);
    if (q == NULL)
        return NULL;                        /* original block untouched */
    memcpy(q, p, usable);
    my_free(p);
    return q;
}
```

The overflow check is the important part: without it, `my_calloc(1 << 20, 1 << 20)` on a 32-bit system would compute a tiny size, succeed, and let the caller write far past the end of the block. Real `calloc` bugs of exactly this kind have caused security vulnerabilities.

</details>

## Exercise 8-6 · Stress-testing the allocator <span class="diff hard">hard</span>

Write a test that performs 100,000 random allocations and frees with `my_malloc`/`my_free`, fills each block with a pattern unique to it, checks that the pattern is intact before freeing, and verifies at the end that the whole heap can be allocated again as one block (meaning all free space was coalesced).

<details class="solution"><summary>Solution</summary>

```c
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SLOTS 256

int main(void)
{
    unsigned char *ptr[SLOTS] = {0};
    size_t len[SLOTS] = {0};
    srand(12345);

    for (long step = 0; step < 100000; step++) {
        int i = rand() % SLOTS;
        if (ptr[i] != NULL) {
            for (size_t k = 0; k < len[i]; k++)
                assert(ptr[i][k] == (unsigned char)i);   /* nobody overwrote it */
            my_free(ptr[i]);
            ptr[i] = NULL;
        } else {
            len[i] = 1 + (size_t)(rand() % 4000);
            ptr[i] = my_malloc(len[i]);
            if (ptr[i] != NULL)
                memset(ptr[i], i, len[i]);
        }
    }
    for (int i = 0; i < SLOTS; i++)
        my_free(ptr[i]);

    void *all = my_malloc(HEAP_BYTES - HDR);
    assert(all != NULL);                 /* everything merged back together */
    puts("allocator survived");
    return 0;
}
```

Because each block holds a unique byte value, any overlap between two live blocks, or a header written into user data, is caught by the assertion when the damaged block is freed. Running the test under `-fsanitize=address` adds a second line of defense.

</details>
