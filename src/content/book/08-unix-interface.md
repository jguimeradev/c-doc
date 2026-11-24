---
title: The UNIX System Interface
number: "8"
order: 8
summary: Below the standard library — file descriptors, system calls, directories, and a storage allocator.
---

The standard library is portable because it sits on top of whatever the operating system offers. On UNIX-like systems (Linux, macOS, the BSDs) that foundation is a set of **system calls**, functions that ask the kernel to do something on the program's behalf. They are specified by POSIX rather than the C standard, so code in this chapter isn't portable to every C implementation, but it runs on nearly every server and developer machine.

There are two reasons to learn this layer. Sometimes you need something the standard library doesn't offer (directories, permissions, processes, sockets). And seeing how the library is built on these calls makes its behavior, especially buffering, much less mysterious.

## 8.1 File Descriptors

In UNIX, all input and output, whether to a disk file, terminal, pipe or network socket, goes through **files**, and an open file is identified by a small non-negative integer called a **file descriptor**. The kernel keeps the real state (position, permissions, the underlying device); the program just holds the number.

Three descriptors are open when a program starts, matching the standard streams:

| Descriptor | Constant | Stream |
|---|---|---|
| 0 | `STDIN_FILENO` | `stdin` |
| 1 | `STDOUT_FILENO` | `stdout` |
| 2 | `STDERR_FILENO` | `stderr` |

When the shell runs `prog < in > out`, it opens those files and arranges for them to be descriptors 0 and 1 before starting `prog`. The program can't tell the difference.

The constants and most calls in this chapter come from `<unistd.h>` and `<fcntl.h>`.

## 8.2 Low Level I/O: Read and Write

Two system calls do all the reading and writing:

```c
#include <unistd.h>

ssize_t read(int fd, void *buf, size_t n);
ssize_t write(int fd, const void *buf, size_t n);
```

Each transfers up to `n` bytes between the descriptor and `buf`, and returns how many it actually transferred. For `read`, `0` means end of file and `-1` means an error (with the cause in [`errno`](/errno/macro.errno/)). Neither call knows anything about lines or characters; they move raw bytes.

A partial transfer is normal, not an error: reading a terminal returns at most one line; reading a pipe returns whatever is available; a `write` to a pipe or socket may accept only part of the data. Robust code loops:

```c
#include <errno.h>
#include <unistd.h>

/* write_all: write all n bytes of buf to fd; return 0 or -1 */
int write_all(int fd, const char *buf, size_t n)
{
    while (n > 0) {
        ssize_t w = write(fd, buf, n);
        if (w < 0) {
            if (errno == EINTR)
                continue;          /* interrupted by a signal: retry */
            return -1;
        }
        buf += w;
        n -= (size_t)w;
    }
    return 0;
}
```

With that, copying input to output needs no standard I/O at all:

```c
#include <stdio.h>     /* only for perror */
#include <unistd.h>

int write_all(int fd, const char *buf, size_t n);   /* defined above */

int main(void)
{
    char buf[65536];
    ssize_t n;

    while ((n = read(STDIN_FILENO, buf, sizeof buf)) > 0)
        if (write_all(STDOUT_FILENO, buf, (size_t)n) < 0) {
            perror("write");
            return 1;
        }
    if (n < 0) {
        perror("read");
        return 1;
    }
    return 0;
}
```

**Buffer size matters.** Every system call costs a switch into the kernel. Calling `read` for each byte would be dramatically slower than reading 64 KB at a time. That's precisely the problem the standard I/O library solves: `getc` takes characters from a user-space buffer and only calls `read` when the buffer is empty.

## 8.3 Open, Creat, Close, Unlink

To use a file other than the standard three, open it to get a descriptor:

```c
#include <fcntl.h>

int open(const char *path, int flags, ... /* mode_t mode */);
```

`flags` combines one access mode, `O_RDONLY`, `O_WRONLY` or `O_RDWR`, with options:

| Flag | Effect |
|---|---|
| `O_CREAT` | create the file if it doesn't exist (requires the `mode` argument) |
| `O_TRUNC` | truncate an existing file to zero length |
| `O_APPEND` | every write goes to the current end of file |
| `O_EXCL` | with `O_CREAT`, fail if the file already exists |
| `O_CLOEXEC` | close automatically if the program `exec`s another |

`open` returns a new descriptor (the lowest unused number), or `-1` on error.

The `mode` gives permission bits for a newly created file, usually written in octal: `0644` means the owner may read and write, and everyone else may read. The process's *umask* then clears some bits.

The old call `creat(path, mode)` is equivalent to `open(path, O_WRONLY | O_CREAT | O_TRUNC, mode)`; you'll see it in older code.

`close(fd)` releases a descriptor. A process can only have a limited number open at once (check with `ulimit -n`), so long-running programs must close what they no longer need. All descriptors are closed when the process exits.

`unlink(path)` removes a name from the file system, which is how files are deleted; the standard library's [`remove`](/stdio/fn.remove/) is built on it.

A file-copying program using these calls, with error messages that say what went wrong:

```c
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>

int write_all(int fd, const char *buf, size_t n);   /* from 8.2 */

int main(int argc, char *argv[])
{
    if (argc != 3) {
        fprintf(stderr, "usage: %s SOURCE DEST\n", argv[0]);
        return 2;
    }
    int in = open(argv[1], O_RDONLY);
    if (in < 0) {
        fprintf(stderr, "%s: %s: %s\n", argv[0], argv[1], strerror(errno));
        return 1;
    }
    int out = open(argv[2], O_WRONLY | O_CREAT | O_EXCL, 0644);
    if (out < 0) {
        fprintf(stderr, "%s: %s: %s\n", argv[0], argv[2], strerror(errno));
        close(in);
        return 1;
    }

    char buf[65536];
    ssize_t n;
    int status = 0;
    while ((n = read(in, buf, sizeof buf)) > 0)
        if (write_all(out, buf, (size_t)n) < 0) {
            perror("write");
            status = 1;
            break;
        }
    if (n < 0) {
        perror("read");
        status = 1;
    }
    close(in);
    if (close(out) < 0) {      /* some file systems report write errors only here */
        perror("close");
        status = 1;
    }
    return status;
}
```

`O_EXCL` makes the program refuse to overwrite an existing destination, which is a safer default than silently destroying it.

## 8.4 Random Access: Lseek

Reads and writes normally proceed sequentially, each starting where the last ended. `lseek` moves that position:

```c
#include <unistd.h>

off_t lseek(int fd, off_t offset, int whence);
```

`whence` is `SEEK_SET` (from the start), `SEEK_CUR` (from the current position) or `SEEK_END` (from the end). It returns the new position, or `-1` on error. `lseek(fd, 0, SEEK_END)` returns the file's size; `lseek(fd, 0, SEEK_CUR)` reports the current position without moving.

Seeking makes files of fixed-size records behave like arrays on disk:

```c
#include <stdint.h>
#include <unistd.h>

struct record {
    uint32_t id;
    char name[28];
};

/* read_record: read the i-th record of fd into *r; return 0 or -1 */
int read_record(int fd, long i, struct record *r)
{
    if (lseek(fd, (off_t)i * (off_t)sizeof *r, SEEK_SET) < 0)
        return -1;
    return read(fd, r, sizeof *r) == (ssize_t)sizeof *r ? 0 : -1;
}
```

POSIX also offers `pread` and `pwrite`, which take the offset as an argument and don't move the shared position, convenient when several threads use one descriptor.

The standard library's [`fseek`](/stdio/fn.fseek/) is the buffered equivalent: it discards or flushes the `FILE`'s buffer and then calls `lseek`.

## 8.5 Example: An Implementation of Buffered Input

Here's how a buffered input layer like the one behind `getc` can be built on `read`. Our version, `struct reader`, wraps a file descriptor with a buffer:

```c
#include <stdlib.h>
#include <unistd.h>

#define READER_BUFSIZE 8192

struct reader {
    int fd;
    unsigned char *pos;     /* next unread byte in buf */
    unsigned char *end;     /* one past the last valid byte */
    int eof, error;
    unsigned char buf[READER_BUFSIZE];
};

void reader_init(struct reader *r, int fd)
{
    r->fd = fd;
    r->pos = r->end = r->buf;
    r->eof = r->error = 0;
}

/* refill: read more data; return the first new byte, or -1 at EOF or error */
static int refill(struct reader *r)
{
    if (r->eof || r->error)
        return -1;
    ssize_t n = read(r->fd, r->buf, sizeof r->buf);
    if (n <= 0) {
        if (n == 0) r->eof = 1; else r->error = 1;
        return -1;
    }
    r->pos = r->buf;
    r->end = r->buf + n;
    return *r->pos++;
}

/* reader_getc: next byte as 0-255, or -1 at end of input */
static inline int reader_getc(struct reader *r)
{
    return (r->pos < r->end) ? *r->pos++ : refill(r);
}
```

The fast path in `reader_getc` is one comparison and one pointer increment; the system call happens only once every 8 KB. Returning bytes as `unsigned char` values converted to `int` keeps every byte value distinct from the end marker `-1`, the same reason `getc` returns `int` and `EOF` is negative.

Real implementations of `FILE` add output buffering, line buffering for terminals, `ungetc` support, and locking for threads, but the core is this.

Using it to count lines is as easy as with `getc`:

```c
int main(void)
{
    struct reader r;
    long lines = 0;
    int c;

    reader_init(&r, STDIN_FILENO);
    while ((c = reader_getc(&r)) != -1)
        if (c == '\n')
            lines++;
    printf("%ld\n", lines);
    return r.error ? 1 : 0;
}
```

## 8.6 Example: Listing Directories

A directory is a file containing a list of names and the numbers of the *inodes* that describe each file. Its on-disk format differs between file systems, so POSIX provides a portable interface in `<dirent.h>`:

```c
DIR *opendir(const char *path);
struct dirent *readdir(DIR *dir);   /* next entry, or NULL at the end */
int closedir(DIR *dir);
```

Each `struct dirent` has at least a `d_name` member holding the entry's name. To learn about the file itself, call `stat` (from `<sys/stat.h>`), which fills a `struct stat` with its size, type, permissions, owner and timestamps.

Here's a small `du`-like program that prints each file's size and, given `-r`, walks subdirectories recursively:

```c
#include <dirent.h>
#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>

static int recursive = 0;

/* walk: print the size of path; if it's a directory, of everything beneath it;
   return the total in bytes */
static long long walk(const char *path)
{
    struct stat st;

    if (lstat(path, &st) < 0) {           /* lstat: don't follow symlinks */
        fprintf(stderr, "%s: %s\n", path, strerror(errno));
        return 0;
    }
    long long total = st.st_size;

    if (S_ISDIR(st.st_mode) && recursive) {
        DIR *d = opendir(path);
        if (d == NULL) {
            fprintf(stderr, "%s: %s\n", path, strerror(errno));
            return total;
        }
        struct dirent *e;
        char child[4096];
        while ((e = readdir(d)) != NULL) {
            if (strcmp(e->d_name, ".") == 0 || strcmp(e->d_name, "..") == 0)
                continue;                 /* skip self and parent */
            if (snprintf(child, sizeof child, "%s/%s", path, e->d_name) >= (int)sizeof child)
                continue;                 /* path too long */
            total += walk(child);
        }
        closedir(d);
    }
    printf("%12lld  %s\n", total, path);
    return total;
}

int main(int argc, char *argv[])
{
    int i = 1;
    if (i < argc && strcmp(argv[i], "-r") == 0) {
        recursive = 1;
        i++;
    }
    if (i == argc)
        walk(".");
    for (; i < argc; i++)
        walk(argv[i]);
    return 0;
}
```

Skipping `.` and `..` is essential; following them would recurse forever. Using `lstat` instead of `stat` prevents symbolic links from causing loops too. For serious use, POSIX's `nftw` performs this kind of walk with all the edge cases handled.

## 8.7 Example: A Storage Allocator

[`malloc`](/stdlib/fn.malloc/) and [`free`](/stdlib/fn.free/) aren't magic; they're ordinary C code managing a region of memory. This section builds a small but complete allocator to show the essential ideas. It manages a fixed array (a real allocator would ask the kernel for more memory with `mmap` or `sbrk`).

**Design.** Each block of memory, allocated or free, starts with a small header recording its size. Free blocks are additionally kept on a linked list sorted by address, which makes it easy to merge adjacent free blocks when memory is returned. Allocation uses **first fit**: walk the free list and take the first block that's big enough, splitting off the unused remainder.

```c
#include <stddef.h>
#include <stdalign.h>

#define HEAP_BYTES (1 << 20)

struct block {
    size_t size;            /* total bytes in this block, header included */
    struct block *next;     /* next free block (only meaningful while free) */
};

#define ALIGN  alignof(max_align_t)
#define HDR    ((sizeof(struct block) + ALIGN - 1) / ALIGN * ALIGN)
#define MIN_BLOCK (HDR + ALIGN)

static alignas(max_align_t) unsigned char heap[HEAP_BYTES];
static struct block *free_list;
static int initialized;

static size_t round_up(size_t n)
{
    return (n + ALIGN - 1) / ALIGN * ALIGN;
}

void *my_malloc(size_t n)
{
    if (!initialized) {
        free_list = (struct block *)heap;
        free_list->size = HEAP_BYTES;
        free_list->next = NULL;
        initialized = 1;
    }
    if (n == 0 || n > HEAP_BYTES)
        return NULL;
    size_t need = HDR + round_up(n);

    for (struct block **link = &free_list; *link != NULL; link = &(*link)->next) {
        struct block *b = *link;
        if (b->size < need)
            continue;
        if (b->size - need >= MIN_BLOCK) {      /* split: keep the tail free */
            struct block *rest = (struct block *)((unsigned char *)b + need);
            rest->size = b->size - need;
            rest->next = b->next;
            *link = rest;
            b->size = need;
        } else {                                /* use the whole block */
            *link = b->next;
        }
        return (unsigned char *)b + HDR;
    }
    return NULL;                                /* nothing large enough */
}

void my_free(void *p)
{
    if (p == NULL)
        return;
    struct block *b = (struct block *)((unsigned char *)p - HDR);

    /* find the free blocks just before and just after b */
    struct block *prev = NULL, *next = free_list;
    while (next != NULL && next < b) {
        prev = next;
        next = next->next;
    }

    /* merge with the following block if it's adjacent */
    if (next != NULL && (unsigned char *)b + b->size == (unsigned char *)next) {
        b->size += next->size;
        b->next = next->next;
    } else {
        b->next = next;
    }

    /* merge with the preceding block if it's adjacent; otherwise link b in */
    if (prev != NULL && (unsigned char *)prev + prev->size == (unsigned char *)b) {
        prev->size += b->size;
        prev->next = b->next;
    } else if (prev != NULL) {
        prev->next = b;
    } else {
        free_list = b;
    }
}
```

Some points to study:

- **Alignment.** `malloc` must return memory suitable for any type. Rounding the header and every request up to `alignof(max_align_t)`, and aligning the heap array itself, guarantees each returned pointer is suitably aligned.
- **The header is hidden.** The caller gets the address just past the header. `my_free` steps back by `HDR` to find it, which is why passing `free` a pointer that didn't come from `malloc`, or freeing twice, corrupts the heap.
- **Splitting and coalescing.** Without splitting, a 16-byte request could consume a megabyte block. Without coalescing, memory would fragment into pieces too small to reuse even when large regions are free.
- **Comparing pointers.** `next < b` compares addresses of blocks within the same `heap` array, which is well defined.

Production allocators (glibc's ptmalloc, jemalloc, mimalloc) add size-class bins for speed, per-thread caches, returning memory to the OS, and defenses against heap corruption, but they rest on these same ideas.
